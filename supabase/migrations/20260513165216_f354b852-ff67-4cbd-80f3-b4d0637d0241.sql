CREATE OR REPLACE FUNCTION public.marcar_folha_paga(p_folha_id uuid, p_data text, p_conta_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_folha record;
  v_data timestamptz;
  v_conta uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_folha FROM obra_folhas_pagamento
   WHERE id = p_folha_id AND user_id = v_user AND deleted_at IS NULL FOR UPDATE;
  IF v_folha IS NULL THEN RAISE EXCEPTION 'folha não encontrada'; END IF;
  IF v_folha.financeiro_transacao_id IS NULL THEN
    RAISE EXCEPTION 'folha ainda não foi lançada no financeiro';
  END IF;

  v_data := COALESCE(NULLIF(p_data,'')::timestamptz, v_folha.data_fechamento::timestamptz);
  v_conta := NULLIF(p_conta_id,'')::uuid;

  UPDATE obra_transacoes_fluxo
    SET status='pago',
        data_pagamento = v_data,
        conta_id = COALESCE(v_conta, conta_id)
  WHERE id = v_folha.financeiro_transacao_id AND user_id = v_user;

  UPDATE obra_folhas_pagamento SET status='paga' WHERE id = p_folha_id;

  PERFORM public._folha_audit(v_user, 'marcar_paga', p_folha_id, jsonb_build_object(
    'transacao_id', v_folha.financeiro_transacao_id,
    'data_pagamento', v_data,
    'conta_id', v_conta,
    'competencia_mes', v_folha.competencia_mes
  ));

  RETURN jsonb_build_object('ok', true);
END $function$;