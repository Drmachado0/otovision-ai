-- Conciliação explícita por evidência bancária. Não cria obrigações e não
-- aceita aproximação de valor: a movimentação deve corresponder exatamente a
-- uma transação já existente do mesmo tenant.

CREATE OR REPLACE FUNCTION public.reconcile_bank_movement(
  p_movement_id UUID,
  p_transaction_id UUID,
  p_generate_commission BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_movement public.obra_movimentacoes_extraidas%ROWTYPE;
  v_transaction public.obra_transacoes_fluxo%ROWTYPE;
  v_existing public.obra_conciliacoes_bancarias%ROWTYPE;
  v_payment JSONB;
  v_conciliation_id UUID;
  v_idempotency_key TEXT;
  v_paid_at TIMESTAMPTZ;
  v_replay BOOLEAN := false;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;
  IF NOT public.fin_can_write() THEN
    RAISE EXCEPTION 'Sem permissão para conciliar' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user::TEXT || ':bank-movement:' || p_movement_id::TEXT, 0));

  SELECT mov.* INTO v_movement
  FROM public.obra_movimentacoes_extraidas mov
  WHERE mov.id = p_movement_id AND mov.user_id = v_user
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Movimentação bancária não encontrada' USING ERRCODE = 'P0002';
  END IF;
  IF v_movement.conta_id IS NULL THEN
    RAISE EXCEPTION 'Movimentação sem conta bancária' USING ERRCODE = '23514';
  END IF;
  IF NULLIF(btrim(v_movement.extrato_fit_id), '') IS NULL THEN
    RAISE EXCEPTION 'Movimentação sem FITID' USING ERRCODE = '23514';
  END IF;

  SELECT tx.* INTO v_transaction
  FROM public.obra_transacoes_fluxo tx
  WHERE tx.id = p_transaction_id AND tx.user_id = v_user AND tx.deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Obrigação financeira não encontrada' USING ERRCODE = 'P0002';
  END IF;
  IF lower(v_movement.tipo_movimentacao) NOT IN ('saída', 'saida')
     OR lower(v_transaction.tipo) NOT IN ('saída', 'saida') THEN
    RAISE EXCEPTION 'Conciliação implementada somente para saídas' USING ERRCODE = '22023';
  END IF;
  IF v_transaction.conta_id IS NOT NULL AND v_transaction.conta_id <> v_movement.conta_id THEN
    RAISE EXCEPTION 'Conta da movimentação diverge da conta selecionada' USING ERRCODE = '23514';
  END IF;
  IF round(v_movement.valor, 2) IS DISTINCT FROM round(v_transaction.valor, 2) THEN
    RAISE EXCEPTION 'Valor da movimentação diverge da obrigação' USING ERRCODE = '23514';
  END IF;

  SELECT c.* INTO v_existing
  FROM public.obra_conciliacoes_bancarias c
  WHERE c.movimentacao_extraida_id = p_movement_id
    AND c.status_conciliacao NOT IN ('desfeita', 'ignorado_temporariamente')
  FOR UPDATE;
  IF FOUND THEN
    IF v_existing.user_id <> v_user OR v_existing.transacao_id IS DISTINCT FROM p_transaction_id THEN
      RAISE EXCEPTION 'Movimentação já conciliada com outra transação' USING ERRCODE = '23505';
    END IF;
    RETURN jsonb_build_object(
      'success', true,
      'conciliation_id', v_existing.id,
      'transaction_id', p_transaction_id,
      'movement_id', p_movement_id,
      'extrato_fit_id', v_movement.extrato_fit_id,
      'idempotent_replay', true
    );
  END IF;

  v_idempotency_key := left(format('bank:%s:%s', v_movement.conta_id, v_movement.extrato_fit_id), 200);
  v_paid_at := (v_movement.data_movimentacao::DATE + time '12:00') AT TIME ZONE 'America/Sao_Paulo';

  IF lower(COALESCE(v_transaction.status, 'pendente')) <> 'pago' THEN
    v_payment := public.pay_financial_obligation(
      'transaction', p_transaction_id, v_movement.conta_id,
      'Conciliação OFX', v_paid_at, p_generate_commission,
      v_idempotency_key, NULL, NULL
    );
  ELSE
    IF v_transaction.conta_id IS DISTINCT FROM v_movement.conta_id THEN
      RAISE EXCEPTION 'Conta da movimentação diverge da conta selecionada' USING ERRCODE = '23514';
    END IF;
    v_payment := jsonb_build_object(
      'transaction_id', p_transaction_id,
      'already_paid', true,
      'idempotent_replay', false
    );
  END IF;

  INSERT INTO public.obra_conciliacoes_bancarias(
    user_id, movimentacao_extraida_id, transacao_id, status_conciliacao,
    score_compatibilidade, tipo_conciliacao, motivo_matching, observacoes,
    conciliado_por, conciliado_em
  ) VALUES (
    v_user, p_movement_id, p_transaction_id, 'conciliado',
    100, 'manual_exata', 'Conta e valor exatos; confirmação explícita do usuário',
    format('FITID %s', v_movement.extrato_fit_id), v_user, now()
  )
  ON CONFLICT (movimentacao_extraida_id)
    WHERE status_conciliacao NOT IN ('desfeita', 'ignorado_temporariamente')
  DO UPDATE SET transacao_id = EXCLUDED.transacao_id
  WHERE public.obra_conciliacoes_bancarias.user_id = v_user
    AND public.obra_conciliacoes_bancarias.transacao_id = EXCLUDED.transacao_id
  RETURNING id INTO v_conciliation_id;

  IF v_conciliation_id IS NULL THEN
    RAISE EXCEPTION 'Movimentação já conciliada com outra transação' USING ERRCODE = '23505';
  END IF;

  UPDATE public.obra_movimentacoes_extraidas
  SET status_revisao = 'aprovado', transacao_id = p_transaction_id
  WHERE id = p_movement_id AND user_id = v_user;

  UPDATE public.obra_transacoes_fluxo
  SET conciliado = true, updated_at = now()
  WHERE id = p_transaction_id AND user_id = v_user;

  INSERT INTO public.obra_eventos_conciliacao(
    user_id, conciliacao_id, acao, detalhes
  ) VALUES (
    v_user, v_conciliation_id, 'conciliacao_manual_exata',
    jsonb_build_object(
      'movimentacao_extraida_id', p_movement_id,
      'transacao_id', p_transaction_id,
      'conta_id', v_movement.conta_id,
      'extrato_fit_id', v_movement.extrato_fit_id,
      'valor', v_movement.valor
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'conciliation_id', v_conciliation_id,
    'transaction_id', p_transaction_id,
    'movement_id', p_movement_id,
    'extrato_fit_id', v_movement.extrato_fit_id,
    'payment', v_payment,
    'idempotent_replay', v_replay
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_bank_movement(UUID, UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reconcile_bank_movement(UUID, UUID, BOOLEAN) TO authenticated;
