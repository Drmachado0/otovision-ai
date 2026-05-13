-- Audit triggers for folha tables
DROP TRIGGER IF EXISTS audit_obra_folhas_pagamento ON public.obra_folhas_pagamento;
CREATE TRIGGER audit_obra_folhas_pagamento
  AFTER INSERT OR UPDATE OR DELETE ON public.obra_folhas_pagamento
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_obra_folha_pagamento_itens ON public.obra_folha_pagamento_itens;
CREATE TRIGGER audit_obra_folha_pagamento_itens
  AFTER INSERT OR UPDATE OR DELETE ON public.obra_folha_pagamento_itens
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_obra_folha_pagamento_encargos ON public.obra_folha_pagamento_encargos;
CREATE TRIGGER audit_obra_folha_pagamento_encargos
  AFTER INSERT OR UPDATE OR DELETE ON public.obra_folha_pagamento_encargos
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Helper: log uma ação customizada de folha
CREATE OR REPLACE FUNCTION public._folha_audit(p_user uuid, p_acao text, p_folha_id uuid, p_dados jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.obra_audit_log (user_id, user_email, acao, tabela, registro_id, dados_novos)
  VALUES (
    COALESCE(p_user, '00000000-0000-0000-0000-000000000000'),
    COALESCE(current_setting('request.jwt.claims', true)::json->>'email', ''),
    p_acao,
    'obra_folhas_pagamento',
    p_folha_id::text,
    p_dados
  );
END;
$$;

-- Recriar lancar_folha_financeiro com audit
CREATE OR REPLACE FUNCTION public.lancar_folha_financeiro(p_folha_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_folha record;
  v_ref text;
  v_existing uuid;
  v_tx_id uuid;
  v_com_id uuid;
  v_resumo text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;

  SELECT * INTO v_folha FROM obra_folhas_pagamento
   WHERE id = p_folha_id AND user_id = v_user AND deleted_at IS NULL FOR UPDATE;
  IF v_folha IS NULL THEN RAISE EXCEPTION 'folha não encontrada'; END IF;
  IF v_folha.status NOT IN ('rascunho','conferida') THEN
    RAISE EXCEPTION 'folha já lançada (status=%)', v_folha.status USING ERRCODE='23505';
  END IF;

  v_ref := 'FOLHA-' || replace(v_folha.competencia_mes,'-','-');

  SELECT id INTO v_existing FROM obra_transacoes_fluxo
   WHERE user_id = v_user AND referencia = v_ref AND deleted_at IS NULL LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'já existe lançamento com referência % (id=%)', v_ref, v_existing USING ERRCODE='23505';
  END IF;

  v_resumo := 'Folha de pagamento ' || _folha_competencia_label(v_folha.competencia_mes)
    || '. Funcionários: ' || v_folha.total_funcionarios::text
    || '. Total funcionários: R$ ' || to_char(v_folha.total_funcionarios,'FM999G999G990D00')
    || '. Encargos: R$ ' || to_char(v_folha.total_encargos,'FM999G999G990D00')
    || '. Detalhamento completo na aba Mão de Obra.';

  INSERT INTO obra_transacoes_fluxo
    (id, user_id, tipo, descricao, categoria, valor, data, forma_pagamento,
     observacoes, recorrencia, referencia, origem_tipo, origem_id, status)
  VALUES
    (gen_random_uuid(), v_user, 'Saída',
     'Folha de pagamento ' || _folha_competencia_label(v_folha.competencia_mes),
     'Mão de Obra', v_folha.total_geral, v_folha.data_fechamento, 'A Vista',
     v_resumo, 'Única', v_ref, 'folha_pagamento', p_folha_id::text, 'pendente')
  RETURNING id INTO v_tx_id;

  IF v_folha.gerar_comissao AND v_folha.total_geral > 0 THEN
    INSERT INTO obra_comissao_pagamentos
      (id, user_id, mes, data_pagamento, valor, pago, observacoes, auto, transacao_id, categoria, fornecedor, forma_pagamento)
    VALUES
      (gen_random_uuid(), v_user, v_folha.competencia_mes, v_folha.data_fechamento,
       round(v_folha.total_geral * 0.08, 2), false,
       'Comissão 8% folha ' || v_folha.competencia_mes, true, v_tx_id,
       'Mão de Obra', 'Folha de pagamento', 'A Vista')
    RETURNING id INTO v_com_id;
  END IF;

  UPDATE obra_folhas_pagamento
    SET status='lancada', financeiro_transacao_id=v_tx_id, comissao_id=v_com_id
    WHERE id = p_folha_id;

  PERFORM public._folha_audit(v_user, 'lancar_financeiro', p_folha_id, jsonb_build_object(
    'transacao_id', v_tx_id,
    'comissao_id', v_com_id,
    'referencia', v_ref,
    'total_geral', v_folha.total_geral,
    'competencia_mes', v_folha.competencia_mes
  ));

  RETURN jsonb_build_object('transacao_id', v_tx_id, 'comissao_id', v_com_id, 'referencia', v_ref);
END $function$;

-- Recriar marcar_folha_paga com audit
CREATE OR REPLACE FUNCTION public.marcar_folha_paga(p_folha_id uuid, p_data text, p_conta_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  PERFORM public._folha_audit(v_user, 'marcar_paga', p_folha_id, jsonb_build_object(
    'transacao_id', v_folha.financeiro_transacao_id,
    'data_pagamento', COALESCE(p_data, v_folha.data_fechamento::text),
    'conta_id', p_conta_id,
    'competencia_mes', v_folha.competencia_mes
  ));

  RETURN jsonb_build_object('ok', true);
END $function$;

-- Recriar reabrir_folha com audit
CREATE OR REPLACE FUNCTION public.reabrir_folha(p_folha_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_folha record;
  v_tx record;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_folha FROM obra_folhas_pagamento
   WHERE id = p_folha_id AND user_id = v_user AND deleted_at IS NULL FOR UPDATE;
  IF v_folha IS NULL THEN RAISE EXCEPTION 'folha não encontrada'; END IF;
  IF v_folha.status = 'paga' THEN
    RAISE EXCEPTION 'folha já paga não pode ser reaberta';
  END IF;

  IF v_folha.financeiro_transacao_id IS NOT NULL THEN
    SELECT * INTO v_tx FROM obra_transacoes_fluxo WHERE id = v_folha.financeiro_transacao_id;
    IF v_tx.status = 'pago' THEN
      RAISE EXCEPTION 'transação já paga não pode ser removida';
    END IF;
    UPDATE obra_transacoes_fluxo SET deleted_at = now() WHERE id = v_folha.financeiro_transacao_id;
  END IF;
  IF v_folha.comissao_id IS NOT NULL THEN
    UPDATE obra_comissao_pagamentos SET deleted_at = now() WHERE id = v_folha.comissao_id;
  END IF;

  UPDATE obra_folhas_pagamento
    SET status='rascunho', financeiro_transacao_id = NULL, comissao_id = NULL
    WHERE id = p_folha_id;

  PERFORM public._folha_audit(v_user, 'reabrir', p_folha_id, jsonb_build_object(
    'transacao_id_removida', v_folha.financeiro_transacao_id,
    'comissao_id_removida', v_folha.comissao_id,
    'competencia_mes', v_folha.competencia_mes
  ));

  RETURN jsonb_build_object('ok', true);
END $function$;