-- Substitui as versões experimentais por desligamento determinístico.
-- O identificador de grupo é TEXT no schema real. A lista de séries é
-- materializada antes de qualquer UPDATE para não depender de estado mutável.

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
  v_series_disabled INTEGER := 0;
  v_pending_hidden INTEGER := 0;
  v_remaining_active INTEGER := 0;
  v_remaining_pending INTEGER := 0;
  v_hidden_ids UUID[] := ARRAY[]::UUID[];
  v_series RECORD;
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
    WHERE d.id = p_delegation_id
      AND d.user_id = v_user
      AND d.enabled IS TRUE
      AND (d.expires_at IS NULL OR d.expires_at > now())
      AND d.scopes @> ARRAY['launch']::TEXT[]
  ) THEN
    RAISE EXCEPTION 'Delegação inválida ou expirada' USING ERRCODE = '28000';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS pg_temp.recurring_series_to_disable (
    id UUID PRIMARY KEY,
    recorrencia_grupo_id TEXT
  ) ON COMMIT DROP;
  TRUNCATE pg_temp.recurring_series_to_disable;

  FOR v_series IN
    SELECT t.id, t.recorrencia_grupo_id::TEXT AS recorrencia_grupo_id
    FROM public.obra_transacoes_fluxo t
    WHERE t.user_id = v_user
      AND t.deleted_at IS NULL
      AND t.recorrencia_mae IS TRUE
      AND t.recorrencia_ativa IS TRUE
    FOR UPDATE
  LOOP
    INSERT INTO pg_temp.recurring_series_to_disable(id, recorrencia_grupo_id)
    VALUES (v_series.id, v_series.recorrencia_grupo_id)
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  UPDATE public.obra_transacoes_fluxo series
  SET recorrencia_ativa = false,
      recorrencia_fim = COALESCE(series.recorrencia_fim, current_date::TEXT),
      updated_at = now()
  FROM pg_temp.recurring_series_to_disable target
  WHERE series.id = target.id
    AND series.user_id = v_user
    AND series.deleted_at IS NULL
    AND series.recorrencia_mae IS TRUE;
  GET DIAGNOSTICS v_series_disabled = ROW_COUNT;

  WITH hidden AS (
    UPDATE public.obra_transacoes_fluxo occurrence
    SET deleted_at = now(),
        recorrencia_ativa = false,
        updated_at = now(),
        observacoes = concat_ws(' | ', NULLIF(occurrence.observacoes, ''),
          'Ocorrência pendente ocultada ao desativar recorrências automáticas')
    FROM pg_temp.recurring_series_to_disable series
    WHERE occurrence.user_id = v_user
      AND occurrence.deleted_at IS NULL
      AND occurrence.recorrencia_mae IS NOT TRUE
      AND lower(occurrence.status) = 'pendente'
      AND series.recorrencia_grupo_id IS NOT NULL
      AND occurrence.recorrencia_grupo_id = series.recorrencia_grupo_id
    RETURNING occurrence.id
  )
  SELECT count(*), COALESCE(array_agg(id), ARRAY[]::UUID[])
  INTO v_pending_hidden, v_hidden_ids
  FROM hidden;

  SELECT count(*) INTO v_remaining_active
  FROM public.obra_transacoes_fluxo
  WHERE user_id = v_user AND deleted_at IS NULL
    AND recorrencia_mae IS TRUE AND recorrencia_ativa IS TRUE;

  SELECT count(*) INTO v_remaining_pending
  FROM public.obra_transacoes_fluxo occurrence
  WHERE occurrence.user_id = v_user
    AND occurrence.deleted_at IS NULL
    AND occurrence.recorrencia_mae IS NOT TRUE
    AND lower(occurrence.status) = 'pendente'
    AND EXISTS (
      SELECT 1 FROM pg_temp.recurring_series_to_disable series
      WHERE series.recorrencia_grupo_id IS NOT NULL
        AND occurrence.recorrencia_grupo_id = series.recorrencia_grupo_id
    );

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

REVOKE ALL ON FUNCTION public.cancel_assistant_recurring_payables(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_assistant_recurring_payables(UUID, UUID, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_assistant_recurring_payables(UUID, UUID, TEXT) TO service_role;
