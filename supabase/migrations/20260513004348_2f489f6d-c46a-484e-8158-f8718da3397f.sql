
CREATE OR REPLACE FUNCTION public.marcar_folha_paga(p_folha_id uuid, p_data text, p_conta_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_folha record;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_folha FROM obra_folhas_pagamento
   WHERE id = p_folha_id AND user_id = v_user AND deleted_at IS NULL FOR UPDATE;
  IF v_folha IS NULL THEN RAISE EXCEPTION 'folha não encontrada'; END IF;
  IF v_folha.financeiro_transacao_id IS NULL THEN
    RAISE EXCEPTION 'folha ainda não foi lançada no financeiro';
  END IF;

  UPDATE obra_transacoes_fluxo
    SET status='pago',
        data_pagamento = COALESCE(p_data, v_folha.data_fechamento),
        conta_id = COALESCE(p_conta_id, conta_id)
  WHERE id = v_folha.financeiro_transacao_id AND user_id = v_user;

  UPDATE obra_folhas_pagamento SET status='paga' WHERE id = p_folha_id;
  RETURN jsonb_build_object('ok', true);
END $$;
