-- Forward-only: corrige comparação de enum folha_pagamento_status.
-- Corrige incompatibilidade UUID/TEXT da conta e mantém folha + transação atômicas.
CREATE OR REPLACE FUNCTION public.marcar_folha_paga(p_folha_id UUID, p_data TEXT, p_conta_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_folha public.obra_folhas_pagamento%ROWTYPE;
  v_data TIMESTAMPTZ;
  v_conta TEXT;
  v_transaction_id UUID;
BEGIN
  IF v_user IS NULL OR NOT public.fin_can_write() THEN
    RAISE EXCEPTION 'Sem permissão para pagar folha' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_folha FROM public.obra_folhas_pagamento
  WHERE id = p_folha_id AND user_id = v_user AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Folha não encontrada' USING ERRCODE = 'P0002'; END IF;
  IF v_folha.financeiro_transacao_id IS NULL THEN
    RAISE EXCEPTION 'Folha ainda não foi lançada no financeiro' USING ERRCODE = '23514';
  END IF;
  IF lower(COALESCE(v_folha.status::TEXT, '')) = 'paga' THEN
    RETURN jsonb_build_object('ok', true, 'idempotent_replay', true, 'transacao_id', v_folha.financeiro_transacao_id);
  END IF;

  v_data := COALESCE(NULLIF(p_data, '')::TIMESTAMPTZ, v_folha.data_fechamento::TIMESTAMPTZ);
  v_conta := NULLIF(btrim(p_conta_id), '');
  IF v_conta IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.obra_contas_financeiras
    WHERE id::TEXT = v_conta AND user_id = v_user AND ativa IS TRUE
  ) THEN
    RAISE EXCEPTION 'Conta financeira ativa não pertence ao usuário' USING ERRCODE = '23503';
  END IF;

  UPDATE public.obra_transacoes_fluxo
  SET status = 'pago', data_pagamento = v_data,
      conta_id = COALESCE(v_conta, conta_id), updated_at = now()
  WHERE id = v_folha.financeiro_transacao_id AND user_id = v_user AND deleted_at IS NULL
  RETURNING id INTO v_transaction_id;
  IF v_transaction_id IS NULL THEN
    RAISE EXCEPTION 'Transação financeira da folha não encontrada' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.obra_folhas_pagamento
  SET status = 'paga', updated_at = now()
  WHERE id = p_folha_id AND user_id = v_user;

  PERFORM public._folha_audit(v_user, 'marcar_paga', p_folha_id, jsonb_build_object(
    'transacao_id', v_transaction_id, 'data_pagamento', v_data,
    'conta_id', v_conta, 'competencia_mes', v_folha.competencia_mes
  ));

  RETURN jsonb_build_object('ok', true, 'idempotent_replay', false, 'transacao_id', v_transaction_id);
END;
$$;
