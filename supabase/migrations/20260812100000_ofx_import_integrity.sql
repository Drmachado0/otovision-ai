-- Importação bancária conservadora: persiste movimentações imutáveis para
-- revisão, sem criar ou baixar lançamentos financeiros automaticamente.

ALTER TABLE public.obra_movimentacoes_extraidas
  ADD COLUMN IF NOT EXISTS conta_id UUID,
  ADD COLUMN IF NOT EXISTS extrato_fit_id TEXT,
  ADD COLUMN IF NOT EXISTS extrato_arquivo TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_obra_movimentacao_bank_fitid
  ON public.obra_movimentacoes_extraidas(user_id, conta_id, extrato_fit_id)
  WHERE conta_id IS NOT NULL AND extrato_fit_id IS NOT NULL AND btrim(extrato_fit_id) <> '';

CREATE INDEX IF NOT EXISTS idx_obra_movimentacao_bank_review
  ON public.obra_movimentacoes_extraidas(user_id, conta_id, status_revisao, data_movimentacao);

CREATE OR REPLACE FUNCTION public.import_bank_statement(
  p_account_id UUID,
  p_document_id UUID,
  p_source_file TEXT,
  p_transactions JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_item JSONB;
  v_fitid TEXT;
  v_date DATE;
  v_description TEXT;
  v_value NUMERIC;
  v_type TEXT;
  v_imported INTEGER := 0;
  v_duplicates INTEGER := 0;
  v_invalid INTEGER := 0;
  v_id UUID;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;
  IF NOT public.fin_can_write() THEN
    RAISE EXCEPTION 'Sem permissão para importar extrato' USING ERRCODE = '42501';
  END IF;
  IF p_transactions IS NULL OR jsonb_typeof(p_transactions) <> 'array' THEN
    RAISE EXCEPTION 'Lote de transações inválido' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_transactions) = 0 OR jsonb_array_length(p_transactions) > 2000 THEN
    RAISE EXCEPTION 'Lote deve conter entre 1 e 2000 transações' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.obra_contas_financeiras
    WHERE id = p_account_id AND user_id = v_user AND ativa IS TRUE
  ) THEN
    RAISE EXCEPTION 'Conta financeira ativa não pertence ao usuário' USING ERRCODE = '23503';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.obra_documentos_processados
    WHERE user_id = v_user AND id = p_document_id
  ) THEN
    RAISE EXCEPTION 'Documento do extrato não pertence ao usuário' USING ERRCODE = '23503';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user::TEXT || ':' || p_account_id::TEXT || ':' || p_document_id::TEXT, 0));

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_transactions)
  LOOP
    BEGIN
      v_fitid := btrim(COALESCE(v_item->>'fitId', ''));
      IF v_fitid = '' THEN
        RAISE EXCEPTION 'FITID obrigatório' USING ERRCODE = '22023';
      END IF;
      IF length(v_fitid) > 200 THEN
        RAISE EXCEPTION 'FITID excede 200 caracteres' USING ERRCODE = '22023';
      END IF;
      v_date := (v_item->>'data')::DATE;
      v_description := left(btrim(COALESCE(v_item->>'descricao', '')), 1000);
      v_value := (v_item->>'valor')::NUMERIC;
      v_type := v_item->>'tipo';
      IF v_description = '' OR v_value <= 0 OR v_type NOT IN ('Entrada', 'Saída') THEN
        RAISE EXCEPTION 'Movimentação inválida' USING ERRCODE = '22023';
      END IF;

      v_id := NULL;
      INSERT INTO public.obra_movimentacoes_extraidas(
        user_id, documento_id, conta_id, extrato_fit_id, extrato_arquivo,
        data_movimentacao, descricao, valor, tipo_movimentacao,
        categoria_sugerida, score_confianca, score_duplicidade, status_revisao
      ) VALUES (
        v_user, p_document_id, p_account_id, v_fitid, left(COALESCE(p_source_file, ''), 1000),
        v_date, v_description, v_value, v_type,
        '', 100, 0, 'pendente'
      )
      ON CONFLICT (user_id, conta_id, extrato_fit_id)
        WHERE conta_id IS NOT NULL AND extrato_fit_id IS NOT NULL AND btrim(extrato_fit_id) <> ''
      DO NOTHING
      RETURNING id INTO v_id;

      IF v_id IS NULL THEN v_duplicates := v_duplicates + 1;
      ELSE v_imported := v_imported + 1;
      END IF;
    EXCEPTION WHEN SQLSTATE '22023' OR invalid_text_representation OR numeric_value_out_of_range OR datetime_field_overflow OR check_violation THEN
      v_invalid := v_invalid + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'document_id', p_document_id,
    'account_id', p_account_id,
    'imported_count', v_imported,
    'duplicate_count', v_duplicates,
    'invalid_count', v_invalid,
    'financial_transactions_created', 0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_bank_statement(UUID, UUID, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_bank_statement(UUID, UUID, TEXT, JSONB) TO authenticated;
