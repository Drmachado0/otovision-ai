-- Aprovação de dados extraídos cria uma obrigação pendente, nunca uma baixa.
-- Comissão só é avaliada no pagamento pela RPC canônica.

CREATE OR REPLACE FUNCTION public.approve_extracted_movement(
  p_movement_id UUID,
  p_type TEXT,
  p_value NUMERIC,
  p_date DATE,
  p_category TEXT,
  p_description TEXT,
  p_account_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_movement public.obra_movimentacoes_extraidas%ROWTYPE;
  v_transaction_id UUID;
  v_status TEXT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501'; END IF;
  IF NOT public.fin_can_write() THEN RAISE EXCEPTION 'Sem permissão para aprovar movimentação' USING ERRCODE = '42501'; END IF;
  IF p_type NOT IN ('Entrada', 'Saída') OR p_value <= 0 OR p_date IS NULL OR btrim(COALESCE(p_description, '')) = '' THEN
    RAISE EXCEPTION 'Dados financeiros inválidos' USING ERRCODE = '22023';
  END IF;
  IF p_account_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.obra_contas_financeiras
    WHERE id = p_account_id AND user_id = v_user AND ativa IS TRUE
  ) THEN
    RAISE EXCEPTION 'Conta não pertence ao usuário' USING ERRCODE = '23503';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user::TEXT || ':movement-approval:' || p_movement_id::TEXT, 0));
  SELECT mov.* INTO v_movement
  FROM public.obra_movimentacoes_extraidas mov
  WHERE mov.id = p_movement_id AND mov.user_id = v_user
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Movimentação não encontrada' USING ERRCODE = 'P0002'; END IF;

  IF v_movement.transacao_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.obra_transacoes_fluxo tx
      WHERE tx.id = v_movement.transacao_id AND tx.user_id = v_user AND tx.deleted_at IS NULL
    ) THEN
      RETURN jsonb_build_object(
        'success', true, 'transaction_id', v_movement.transacao_id,
        'movement_id', p_movement_id, 'idempotent_replay', true
      );
    END IF;
    RAISE EXCEPTION 'Movimentação vinculada a transação inválida' USING ERRCODE = '23503';
  END IF;

  v_status := CASE WHEN p_type = 'Entrada' THEN 'pago' ELSE 'pendente' END;
  INSERT INTO public.obra_transacoes_fluxo(
    user_id, tipo, valor, data, data_vencimento, data_pagamento,
    categoria, descricao, forma_pagamento, recorrencia, referencia,
    conta_id, status, origem_tipo, origem_id, observacoes
  ) VALUES (
    v_user, p_type, p_value, p_date,
    CASE WHEN p_type = 'Saída' THEN p_date ELSE NULL END,
    CASE WHEN p_type = 'Entrada' THEN p_date::TIMESTAMPTZ ELSE NULL END,
    COALESCE(NULLIF(btrim(p_category), ''), 'Outro'), btrim(p_description),
    '', 'Única', '', p_account_id, v_status, 'movimentacao_extraida',
    p_movement_id::TEXT, 'Obrigação reconhecida a partir de documento; pagamento pendente'
  )
  ON CONFLICT (user_id, origem_tipo, origem_id) WHERE deleted_at IS NULL
    AND origem_tipo IS NOT NULL AND btrim(origem_tipo) <> ''
    AND origem_id IS NOT NULL AND btrim(origem_id) <> ''
  DO UPDATE SET id = public.obra_transacoes_fluxo.id
  RETURNING id INTO v_transaction_id;

  UPDATE public.obra_movimentacoes_extraidas
  SET status_revisao = 'aprovado', transacao_id = v_transaction_id,
      data_movimentacao = p_date, valor = p_value, tipo_movimentacao = p_type,
      categoria_sugerida = COALESCE(NULLIF(btrim(p_category), ''), 'Outro'),
      descricao = btrim(p_description)
  WHERE id = p_movement_id AND user_id = v_user;

  RETURN jsonb_build_object(
    'success', true, 'transaction_id', v_transaction_id,
    'movement_id', p_movement_id, 'status', v_status,
    'idempotent_replay', false, 'commission_created', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_extracted_movement(UUID, TEXT, NUMERIC, DATE, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_extracted_movement(UUID, TEXT, NUMERIC, DATE, TEXT, TEXT, UUID) TO authenticated;
