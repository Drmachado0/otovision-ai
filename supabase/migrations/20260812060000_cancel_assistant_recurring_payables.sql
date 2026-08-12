-- Cancela geradores recorrentes e oculta somente ocorrências ainda pendentes.
-- Histórico pago/cancelado e lançamentos avulsos permanecem intactos.
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
  v_groups UUID[];
  v_mother_ids UUID[];
  v_disabled_count INTEGER := 0;
  v_pending_ids UUID[];
BEGIN
  IF p_confirm IS DISTINCT FROM 'CANCELAR_TODAS_RECORRENCIAS' THEN
    RAISE EXCEPTION 'Confirmação de cancelamento inválida' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::TEXT, 0));
  IF NOT EXISTS (
    SELECT 1
    FROM public.obra_assistant_delegations d
    WHERE d.id = p_delegation_id
      AND d.user_id = p_user_id
      AND d.enabled = true
      AND (d.expires_at IS NULL OR d.expires_at > now())
      AND d.scopes @> ARRAY['launch']::TEXT[]
  ) THEN
    RAISE EXCEPTION 'Delegação inválida ou expirada' USING ERRCODE = '28000';
  END IF;

  SELECT
    COALESCE(array_agg(DISTINCT recorrencia_grupo_id) FILTER (WHERE recorrencia_grupo_id IS NOT NULL), ARRAY[]::UUID[]),
    COALESCE(array_agg(id), ARRAY[]::UUID[])
  INTO v_groups, v_mother_ids
  FROM public.obra_transacoes_fluxo
  WHERE user_id = p_user_id
    AND deleted_at IS NULL
    AND recorrencia_mae = true;

  UPDATE public.obra_transacoes_fluxo
  SET recorrencia_ativa = false,
      recorrencia_fim = COALESCE(recorrencia_fim, current_date),
      updated_at = now()
  WHERE user_id = p_user_id
    AND deleted_at IS NULL
    AND recorrencia_mae = true
    AND recorrencia_ativa = true;
  GET DIAGNOSTICS v_disabled_count = ROW_COUNT;

  WITH removed AS (
    UPDATE public.obra_transacoes_fluxo
    SET deleted_at = now(),
        recorrencia_ativa = false,
        updated_at = now()
    WHERE user_id = p_user_id
      AND deleted_at IS NULL
      AND status = 'pendente'
      AND (
        id = ANY(v_mother_ids)
        OR recorrencia_grupo_id = ANY(v_groups)
      )
    RETURNING id
  )
  SELECT COALESCE(array_agg(id), ARRAY[]::UUID[]) INTO v_pending_ids FROM removed;

  UPDATE public.obra_assistant_delegations
  SET last_used_at = now()
  WHERE id = p_delegation_id AND user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'disabled_series_count', v_disabled_count,
    'removed_pending_count', cardinality(v_pending_ids),
    'removed_pending_ids', to_jsonb(v_pending_ids),
    'preserved_paid', true,
    'preserved_cancelled', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_assistant_recurring_payables(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_assistant_recurring_payables(UUID, UUID, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_assistant_recurring_payables(UUID, UUID, TEXT) TO service_role;
