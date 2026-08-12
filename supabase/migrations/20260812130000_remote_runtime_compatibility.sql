-- Compatibilidade explícita com o schema remoto histórico. As helpers de RLS
-- estavam no repositório, mas a migration correspondente não constava no banco.

CREATE OR REPLACE FUNCTION public.fin_can_write()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'financeiro')
  );
$$;

CREATE OR REPLACE FUNCTION public.fin_can_write_comissao()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.fin_can_write() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fin_can_write_comissao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fin_can_write() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_can_write_comissao() TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_assistant_recurring_payables(
  p_delegation_id UUID,
  p_user_id UUID,
  p_confirm TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := p_user_id;
  v_series_ids UUID[] := ARRAY[]::UUID[];
  v_group_ids TEXT[] := ARRAY[]::TEXT[];
  v_series_disabled INTEGER := 0;
  v_pending_hidden INTEGER := 0;
  v_remaining_active INTEGER := 0;
  v_remaining_pending INTEGER := 0;
  v_hidden_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  IF p_confirm IS DISTINCT FROM 'CANCELAR_TODAS_RECORRENCIAS' THEN
    RAISE EXCEPTION 'Confirmação de cancelamento inválida' USING ERRCODE = '22023';
  END IF;
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Usuário inválido' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user::TEXT || ':recurring-shutdown', 0));
  IF NOT EXISTS (
    SELECT 1 FROM public.obra_assistant_delegations d
    WHERE d.id = p_delegation_id AND d.user_id = v_user AND d.enabled IS TRUE
      AND (d.expires_at IS NULL OR d.expires_at > now())
      AND d.scopes @> ARRAY['launch']::TEXT[]
  ) THEN
    RAISE EXCEPTION 'Delegação inválida ou expirada' USING ERRCODE = '28000';
  END IF;

  SELECT
    COALESCE(array_agg(t.id), ARRAY[]::UUID[]),
    COALESCE(array_agg(DISTINCT t.recorrencia_grupo_id) FILTER (WHERE t.recorrencia_grupo_id IS NOT NULL), ARRAY[]::TEXT[])
  INTO v_series_ids, v_group_ids
  FROM public.obra_transacoes_fluxo t
  WHERE t.user_id = v_user AND t.deleted_at IS NULL
    AND t.recorrencia_mae IS TRUE AND t.recorrencia_ativa IS TRUE;

  PERFORM 1 FROM public.obra_transacoes_fluxo
  WHERE user_id = v_user AND id = ANY(v_series_ids)
  FOR UPDATE;

  UPDATE public.obra_transacoes_fluxo
  SET recorrencia_ativa = false,
      recorrencia_fim = COALESCE(recorrencia_fim, current_date::TEXT),
      updated_at = now()
  WHERE user_id = v_user AND id = ANY(v_series_ids)
    AND deleted_at IS NULL AND recorrencia_mae IS TRUE;
  GET DIAGNOSTICS v_series_disabled = ROW_COUNT;

  WITH hidden AS (
    UPDATE public.obra_transacoes_fluxo occurrence
    SET deleted_at = now(), recorrencia_ativa = false, updated_at = now(),
        observacoes = concat_ws(' | ', NULLIF(occurrence.observacoes, ''),
          'Ocorrência pendente ocultada ao desativar recorrências automáticas')
    WHERE occurrence.user_id = v_user AND occurrence.deleted_at IS NULL
      AND occurrence.recorrencia_mae IS NOT TRUE
      AND lower(occurrence.status) = 'pendente'
      AND occurrence.recorrencia_grupo_id = ANY(v_group_ids)
    RETURNING occurrence.id
  )
  SELECT count(*), COALESCE(array_agg(id), ARRAY[]::UUID[])
  INTO v_pending_hidden, v_hidden_ids FROM hidden;

  SELECT count(*) INTO v_remaining_active
  FROM public.obra_transacoes_fluxo
  WHERE user_id = v_user AND deleted_at IS NULL
    AND recorrencia_mae IS TRUE AND recorrencia_ativa IS TRUE;

  SELECT count(*) INTO v_remaining_pending
  FROM public.obra_transacoes_fluxo
  WHERE user_id = v_user AND deleted_at IS NULL
    AND recorrencia_mae IS NOT TRUE AND lower(status) = 'pendente'
    AND recorrencia_grupo_id = ANY(v_group_ids);

  UPDATE public.obra_assistant_delegations
  SET last_used_at = now(), updated_at = now()
  WHERE id = p_delegation_id AND user_id = v_user;

  RETURN jsonb_build_object(
    'success', true,
    'series_disabled', v_series_disabled,
    'pending_occurrences_hidden', v_pending_hidden,
    'hidden_pending_ids', to_jsonb(v_hidden_ids),
    'remaining_active_series', v_remaining_active,
    'remaining_pending_occurrences', v_remaining_pending,
    'paid_history_preserved', true,
    'cancelled_history_preserved', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_assistant_recurring_payables(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_assistant_recurring_payables(UUID, UUID, TEXT) TO service_role;
