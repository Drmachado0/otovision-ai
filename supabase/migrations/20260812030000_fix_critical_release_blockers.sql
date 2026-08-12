-- Critical release hardening: roles, privileged folha RPCs and atomic backup restore.

-- Every self-service signup receives the least privileged role that can complete
-- obra onboarding. It never grants admin or delete permissions.
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'financeiro')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

REVOKE ALL ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;

-- Backfill existing confirmed accounts that have no role. This keeps the same
-- onboarding capability as new signups without granting administration.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'financeiro'
FROM auth.users AS u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles AS ur WHERE ur.user_id = u.id
)
ON CONFLICT (user_id, role) DO NOTHING;

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
  IF NOT public.fin_can_write() THEN RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE='42501'; END IF;

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
  IF NOT public.fin_can_write() THEN RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE='42501'; END IF;
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
  IF NOT public.fin_can_delete() THEN RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE='42501'; END IF;
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

-- Restrict direct invocation of privileged folha functions. Authorization is
-- also enforced inside each SECURITY DEFINER body (defence in depth).
REVOKE ALL ON FUNCTION public.lancar_folha_financeiro(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.marcar_folha_paga(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reabrir_folha(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lancar_folha_financeiro(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_folha_paga(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reabrir_folha(uuid) TO authenticated;

-- Atomic restore. PostgreSQL functions execute in the caller transaction: any
-- raised error rolls back every inserted row. Original IDs are preserved so
-- foreign keys remain valid. A collision owned by another tenant aborts.
CREATE OR REPLACE FUNCTION public.restore_user_backup(p_tables jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  table_name text;
  row_data jsonb;
  row_id uuid;
  existing_owner uuid;
  inserted_count integer;
  affected_rows integer;
  total_inserted integer := 0;
  summary jsonb := '{}'::jsonb;
  allowed_tables constant text[] := ARRAY[
    'obra_config', 'obra_categorias', 'obra_contas_financeiras',
    'obra_fornecedores', 'obra_funcionarios', 'obra_mao_de_obra',
    'obra_orcamentos', 'obra_composicoes', 'obra_cronograma', 'obra_diario',
    'obra_medicoes', 'obra_compras', 'obra_notas_fiscais',
    'obra_transacoes_fluxo', 'obra_comissao_pagamentos',
    'obra_documentos_processados', 'obra_movimentacoes_extraidas',
    'obra_eventos_processamento', 'obra_conciliacoes_bancarias',
    'obra_sugestoes_conciliacao', 'obra_eventos_conciliacao',
    'obra_mao_obra_registros', 'obra_registro_mao_de_obra',
    'obra_mao_obra_folha', 'obra_mao_obra_folha_item',
    'obra_folhas_pagamento', 'obra_folha_pagamento_itens',
    'obra_folha_pagamento_encargos', 'obra_notificacoes'
  ];
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.fin_can_delete() THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;
  IF p_tables IS NULL OR jsonb_typeof(p_tables) <> 'object' THEN
    RAISE EXCEPTION 'invalid backup tables payload';
  END IF;

  -- Reject unknown tables before processing in a deterministic dependency order.
  FOR table_name IN SELECT jsonb_object_keys(p_tables)
  LOOP
    IF NOT (table_name = ANY(allowed_tables)) THEN
      RAISE EXCEPTION 'table % is not allowed', table_name;
    END IF;
  END LOOP;

  FOREACH table_name IN ARRAY allowed_tables
  LOOP
    CONTINUE WHEN NOT (p_tables ? table_name);
    IF jsonb_typeof(p_tables -> table_name) <> 'array'
       OR jsonb_array_length(p_tables -> table_name) > 10000 THEN
      RAISE EXCEPTION 'invalid or oversized payload for table %', table_name;
    END IF;

    inserted_count := 0;
    FOR row_data IN SELECT value FROM jsonb_array_elements(p_tables -> table_name)
    LOOP
      IF jsonb_typeof(row_data) <> 'object' THEN
        RAISE EXCEPTION 'invalid row for table %', table_name;
      END IF;
      row_id := NULLIF(row_data ->> 'id', '')::uuid;
      IF row_id IS NULL THEN
        RAISE EXCEPTION 'missing id for table %', table_name;
      END IF;

      EXECUTE format('SELECT user_id FROM public.%I WHERE id = $1', table_name)
        INTO existing_owner USING row_id;
      IF existing_owner IS NOT NULL AND existing_owner <> v_user THEN
        RAISE EXCEPTION 'backup id already belongs to another user';
      END IF;

      -- Force tenant ownership, but intentionally keep the original id.
      row_data := (row_data - 'user_id') || jsonb_build_object('user_id', v_user);
      EXECUTE format(
        'INSERT INTO public.%1$I SELECT (jsonb_populate_record(NULL::public.%1$I, $1)).* ON CONFLICT (id) DO NOTHING',
        table_name
      ) USING row_data;
      GET DIAGNOSTICS affected_rows = ROW_COUNT;
      inserted_count := inserted_count + affected_rows;
    END LOOP;

    total_inserted := total_inserted + inserted_count;
    summary := summary || jsonb_build_object(table_name, inserted_count);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'inserted', total_inserted, 'summary', summary);
END;
$$;

REVOKE ALL ON FUNCTION public.restore_user_backup(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_user_backup(jsonb) TO authenticated;
