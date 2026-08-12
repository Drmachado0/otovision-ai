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
  -- Auth users are inserted before email confirmation in the common signup flow.
  -- Anonymous and unconfirmed identities never receive a financial role.
  IF COALESCE(NEW.is_anonymous, false)
     OR COALESCE(NEW.email_confirmed_at, NEW.confirmed_at) IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'financeiro')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

REVOKE ALL ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;

-- Backfill existing confirmed accounts that have no role. This keeps the same
-- onboarding capability as new signups without granting administration.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'financeiro'
FROM auth.users AS u
WHERE u.email_confirmed_at IS NOT NULL
  AND COALESCE(u.is_anonymous, false) = false
  AND NOT EXISTS (
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
    SELECT * INTO v_tx FROM obra_transacoes_fluxo
      WHERE id = v_folha.financeiro_transacao_id AND user_id = v_user;
    IF v_tx IS NULL THEN
      RAISE EXCEPTION 'transação vinculada não pertence ao usuário' USING ERRCODE='42501';
    END IF;
    IF v_tx.status = 'pago' THEN
      RAISE EXCEPTION 'transação já paga não pode ser removida';
    END IF;
    UPDATE obra_transacoes_fluxo SET deleted_at = now()
      WHERE id = v_folha.financeiro_transacao_id AND user_id = v_user;
  END IF;
  IF v_folha.comissao_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM obra_comissao_pagamentos
      WHERE id = v_folha.comissao_id AND user_id = v_user
    ) THEN
      RAISE EXCEPTION 'comissão vinculada não pertence ao usuário' USING ERRCODE='42501';
    END IF;
    UPDATE obra_comissao_pagamentos SET deleted_at = now()
      WHERE id = v_folha.comissao_id AND user_id = v_user;
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

-- Backup restore remains fail-closed until the canonical schema can enforce
-- tenant-aware foreign keys and a complete staging/remapping procedure has been
-- integration-tested. It is safer to deny restore than to create cross-tenant
-- references from attacker-controlled JSON in a SECURITY DEFINER function.
CREATE OR REPLACE FUNCTION public.restore_user_backup(p_tables jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.fin_can_delete() THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;

  RAISE EXCEPTION 'backup restore is temporarily disabled pending tenant-safe validation'
    USING ERRCODE = '0A000';
END;
$$;

REVOKE ALL ON FUNCTION public.restore_user_backup(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_user_backup(jsonb) TO authenticated;
