-- Hardening forward-only do runtime de pagamentos de compras.
ALTER TABLE public.obra_compras
  ADD COLUMN IF NOT EXISTS status_pagamento TEXT;

CREATE OR REPLACE FUNCTION public.pay_financial_obligation(
  p_obligation_type TEXT,
  p_obligation_id UUID,
  p_account_id UUID,
  p_method TEXT,
  p_paid_at TIMESTAMPTZ,
  p_generate_commission BOOLEAN,
  p_idempotency_key TEXT,
  p_installment_number INTEGER DEFAULT NULL,
  p_receipt_path TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_fingerprint TEXT;
  v_existing public.obra_financial_payment_operations%ROWTYPE;
  v_operation_id UUID;
  v_transaction_id UUID;
  v_commission_id UUID;
  v_purchase public.obra_compras%ROWTYPE;
  v_nf public.obra_notas_fiscais%ROWTYPE;
  v_transaction public.obra_transacoes_fluxo%ROWTYPE;
  v_installment JSONB;
  v_installment_count INTEGER;
  v_updated_installments JSONB;
  v_existing_transaction public.obra_transacoes_fluxo%ROWTYPE;
  v_value NUMERIC;
  v_commission_base NUMERIC;
  v_description TEXT;
  v_category TEXT;
  v_supplier TEXT;
  v_reference TEXT;
  v_origin_type TEXT;
  v_origin_id TEXT;
  v_commission_key TEXT;
  v_result JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;
  IF NOT public.fin_can_write() THEN
    RAISE EXCEPTION 'Sem permissão para registrar pagamento' USING ERRCODE = '42501';
  END IF;
  IF p_generate_commission AND NOT public.fin_can_write_comissao() THEN
    RAISE EXCEPTION 'Sem permissão para gerar comissão' USING ERRCODE = '42501';
  END IF;
  IF p_obligation_type NOT IN ('transaction', 'purchase', 'purchase_installment', 'invoice') THEN
    RAISE EXCEPTION 'Tipo de obrigação inválido' USING ERRCODE = '22023';
  END IF;
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) < 12 OR length(p_idempotency_key) > 200 THEN
    RAISE EXCEPTION 'Chave idempotente inválida' USING ERRCODE = '22023';
  END IF;
  IF p_method IS NULL OR length(trim(p_method)) = 0 THEN
    RAISE EXCEPTION 'Método de pagamento obrigatório' USING ERRCODE = '22023';
  END IF;
  IF p_paid_at IS NULL OR p_paid_at > now() + interval '5 minutes' THEN
    RAISE EXCEPTION 'Data de pagamento inválida' USING ERRCODE = '22023';
  END IF;
  IF p_obligation_type = 'purchase_installment' AND COALESCE(p_installment_number, 0) <= 0 THEN
    RAISE EXCEPTION 'Número da parcela inválido' USING ERRCODE = '22023';
  END IF;
  IF p_receipt_path IS NOT NULL
     AND p_receipt_path NOT LIKE v_user_id::TEXT || '/%' THEN
    RAISE EXCEPTION 'Comprovante não pertence ao usuário' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.obra_contas_financeiras
    WHERE id = p_account_id AND user_id = v_user_id AND ativa = true
  ) THEN
    RAISE EXCEPTION 'Conta financeira ativa não pertence ao usuário' USING ERRCODE = '23503';
  END IF;

  v_fingerprint := md5(jsonb_build_object(
    'type', p_obligation_type,
    'id', p_obligation_id,
    'installment', p_installment_number,
    'account', p_account_id,
    'method', trim(p_method),
    'commission', p_generate_commission,
    'receipt', COALESCE(p_receipt_path, '')
  )::TEXT);

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::TEXT || ':' || p_idempotency_key, 0));
  SELECT * INTO v_existing
  FROM public.obra_financial_payment_operations
  WHERE user_id = v_user_id AND idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.request_fingerprint IS DISTINCT FROM v_fingerprint THEN
      RAISE EXCEPTION 'Chave idempotente reutilizada com payload diferente' USING ERRCODE = '23505';
    END IF;
    RETURN v_existing.result || jsonb_build_object('idempotent_replay', true);
  END IF;

  INSERT INTO public.obra_financial_payment_operations(
    user_id, idempotency_key, request_fingerprint, obligation_type,
    obligation_id, installment_number
  ) VALUES (
    v_user_id, p_idempotency_key, v_fingerprint, p_obligation_type,
    p_obligation_id, p_installment_number
  ) RETURNING id INTO v_operation_id;

  IF p_obligation_type IN ('purchase', 'purchase_installment') THEN
    SELECT * INTO v_purchase
    FROM public.obra_compras
    WHERE id = p_obligation_id AND user_id = v_user_id AND deleted_at IS NULL
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Compra não encontrada' USING ERRCODE = 'P0002'; END IF;

    v_supplier := v_purchase.fornecedor;
    v_category := v_purchase.categoria;
    v_commission_base := v_purchase.valor_total;
    v_origin_id := CASE WHEN p_obligation_type = 'purchase_installment'
      THEN format('%s:%s', v_purchase.id, p_installment_number)
      ELSE v_purchase.id::TEXT END;
    v_origin_type := CASE WHEN p_obligation_type = 'purchase_installment' THEN 'compra_parcela' ELSE 'compra' END;
    v_reference := CASE WHEN p_obligation_type = 'purchase_installment'
      THEN format('COMPRA-%s-PARCELA-%s', v_purchase.id, p_installment_number)
      ELSE format('COMPRA-%s', v_purchase.id) END;

    IF p_obligation_type = 'purchase_installment' THEN
      IF v_purchase.parcelas IS NULL
         OR jsonb_typeof(v_purchase.parcelas::JSONB) <> 'array' THEN
        RAISE EXCEPTION 'Parcelas da compra possuem formato inválido' USING ERRCODE = '22023';
      END IF;

      SELECT count(*), (jsonb_agg(item)->0)
      INTO v_installment_count, v_installment
      FROM jsonb_array_elements(v_purchase.parcelas::JSONB) AS item
      WHERE item->>'numero' ~ '^[0-9]+$'
        AND (item->>'numero')::INTEGER = p_installment_number;

      IF v_installment_count <> 1 THEN
        RAISE EXCEPTION 'Número de parcela ausente ou duplicado' USING ERRCODE = '23514';
      END IF;
      IF NOT (v_installment->>'valor' ~ '^[0-9]+([.][0-9]+)?$')
         OR (v_installment->>'valor')::NUMERIC <= 0 THEN
        RAISE EXCEPTION 'Valor da parcela inválido' USING ERRCODE = '23514';
      END IF;
      IF NULLIF(v_installment->>'data_vencimento', '') IS NOT NULL
         AND NOT (v_installment->>'data_vencimento' ~ '^\\d{4}-\\d{2}-\\d{2}$') THEN
        RAISE EXCEPTION 'Vencimento da parcela inválido' USING ERRCODE = '22023';
      END IF;
      IF lower(COALESCE(v_installment->>'status', '')) <> 'pendente' THEN
        RAISE EXCEPTION 'Parcela não está pendente' USING ERRCODE = '23514';
      END IF;
      v_value := (v_installment->>'valor')::NUMERIC;
      v_description := format('Parcela %s/%s - %s', p_installment_number, v_purchase.numero_parcelas,
        COALESCE(NULLIF(v_purchase.descricao, ''), v_purchase.fornecedor));
    ELSE
      IF v_purchase.parcelas IS NOT NULL
         AND jsonb_typeof(v_purchase.parcelas::JSONB) <> 'array' THEN
        RAISE EXCEPTION 'Parcelas da compra possuem formato inválido' USING ERRCODE = '22023';
      END IF;
      IF jsonb_array_length(CASE
           WHEN v_purchase.parcelas IS NULL THEN '[]'::JSONB
           ELSE v_purchase.parcelas::JSONB
         END) > 1
         OR COALESCE(v_purchase.numero_parcelas, 1) > 1 THEN
        RAISE EXCEPTION 'Compra parcelada deve ser paga por parcela' USING ERRCODE = '22023';
      END IF;
      IF lower(COALESCE(v_purchase.status_pagamento, 'pendente')) = 'pago'
         OR lower(COALESCE(v_purchase.status_entrega, '')) = 'cancelado' THEN
        RAISE EXCEPTION 'Obrigação não está pendente' USING ERRCODE = '23514';
      END IF;
      v_value := v_purchase.valor_total;
      v_description := format('Compra - %s', COALESCE(NULLIF(v_purchase.descricao, ''), v_purchase.fornecedor));
    END IF;

  ELSIF p_obligation_type = 'invoice' THEN
    SELECT * INTO v_nf
    FROM public.obra_notas_fiscais
    WHERE id = p_obligation_id AND user_id = v_user_id AND deleted_at IS NULL
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Nota fiscal não encontrada' USING ERRCODE = 'P0002'; END IF;
    IF lower(COALESCE(v_nf.status, '')) <> 'pendente' THEN RAISE EXCEPTION 'Obrigação não está pendente' USING ERRCODE = '23514'; END IF;
    v_value := COALESCE(NULLIF(v_nf.valor_liquido, 0), v_nf.valor_bruto);
    v_commission_base := v_value;
    v_supplier := v_nf.fornecedor;
    v_category := v_nf.categoria;
    v_description := format('NF %s - %s', v_nf.numero, v_nf.fornecedor);
    v_reference := format('NF-%s', v_nf.id);
    v_origin_type := 'nf';
    v_origin_id := v_nf.id::TEXT;

  ELSE
    SELECT * INTO v_transaction
    FROM public.obra_transacoes_fluxo
    WHERE id = p_obligation_id AND user_id = v_user_id AND deleted_at IS NULL
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Transação não encontrada' USING ERRCODE = 'P0002'; END IF;
    IF lower(COALESCE(v_transaction.status, '')) <> 'pendente' THEN RAISE EXCEPTION 'Obrigação não está pendente' USING ERRCODE = '23514'; END IF;
    IF lower(v_transaction.tipo) NOT IN ('saída', 'saida') THEN
      RAISE EXCEPTION 'Somente saídas podem ser pagas' USING ERRCODE = '22023';
    END IF;
    v_transaction_id := v_transaction.id;
    v_value := v_transaction.valor;
    v_commission_base := v_value;
    v_supplier := '';
    v_category := v_transaction.categoria;
    v_description := v_transaction.descricao;
    v_reference := v_transaction.referencia;
    v_origin_type := COALESCE(v_transaction.origem_tipo, 'transacao');
    v_origin_id := COALESCE(v_transaction.origem_id, v_transaction.id::TEXT);
  END IF;

  IF v_value IS NULL OR v_value <= 0 THEN
    RAISE EXCEPTION 'Valor da obrigação inválido' USING ERRCODE = '23514';
  END IF;

  IF p_obligation_type = 'transaction' THEN
    UPDATE public.obra_transacoes_fluxo
    SET status = 'pago', data_pagamento = p_paid_at, conta_id = p_account_id::TEXT,
        forma_pagamento = trim(p_method), metodo_pagamento = trim(p_method),
        comprovante_path = COALESCE(p_receipt_path, comprovante_path), updated_at = now()
    WHERE id = v_transaction_id;
  ELSE
    PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::TEXT || ':origin:' || v_origin_type || ':' || v_origin_id, 0));
    SELECT * INTO v_existing_transaction
    FROM public.obra_transacoes_fluxo
    WHERE user_id = v_user_id
      AND origem_tipo = v_origin_type
      AND origem_id = v_origin_id
      AND deleted_at IS NULL
    FOR UPDATE;

    IF FOUND THEN
      IF v_existing_transaction.valor <> v_value
         OR lower(COALESCE(v_existing_transaction.tipo, '')) NOT IN ('saída', 'saida')
         OR v_existing_transaction.origem_tipo IS DISTINCT FROM v_origin_type
         OR v_existing_transaction.origem_id IS DISTINCT FROM v_origin_id THEN
        RAISE EXCEPTION 'Transação de origem divergente' USING ERRCODE = '23514';
      END IF;
      v_transaction_id := v_existing_transaction.id;
    ELSE
      INSERT INTO public.obra_transacoes_fluxo(
        user_id, tipo, valor, data, data_vencimento, data_pagamento, categoria,
        descricao, forma_pagamento, metodo_pagamento, conta_id, recorrencia,
        referencia, observacoes, origem_tipo, origem_id, status, comprovante_path,
        parcela_numero, parcela_total
      ) VALUES (
        v_user_id, 'Saída', v_value, (p_paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE,
        CASE WHEN p_obligation_type = 'purchase_installment' THEN NULLIF(v_installment->>'data_vencimento', '')::DATE
             WHEN p_obligation_type = 'invoice' THEN NULLIF(v_nf.data_vencimento, '')::DATE ELSE NULL END,
        p_paid_at, v_category, v_description, trim(p_method), trim(p_method), p_account_id::TEXT,
        'Única', v_reference, format('Pagamento atômico da obrigação %s', p_obligation_id),
        v_origin_type, v_origin_id, 'pago', p_receipt_path,
        p_installment_number,
        CASE WHEN p_obligation_type = 'purchase_installment' THEN v_purchase.numero_parcelas ELSE NULL END
      ) RETURNING id INTO v_transaction_id;
    END IF;
  END IF;

  IF p_obligation_type = 'purchase_installment' THEN
    SELECT jsonb_agg(
      CASE WHEN (item->>'numero')::INTEGER = p_installment_number
        THEN item || jsonb_build_object(
          'status', 'Paga', 'transacao_id', v_transaction_id,
          'data_pagamento', p_paid_at, 'conta_id', p_account_id::TEXT,
          'forma_pagamento', trim(p_method)
        )
        ELSE item END ORDER BY ord
    ) INTO v_updated_installments
    FROM jsonb_array_elements(v_purchase.parcelas::JSONB) WITH ORDINALITY AS p(item, ord);

    UPDATE public.obra_compras
    SET parcelas = v_updated_installments,
        status_pagamento = CASE
          WHEN NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(v_updated_installments) item
            WHERE lower(COALESCE(item->>'status', '')) <> 'paga'
          ) THEN 'pago' ELSE COALESCE(status_pagamento, 'pendente') END,
        updated_at = now()
    WHERE id = v_purchase.id;
  ELSIF p_obligation_type = 'purchase' THEN
    UPDATE public.obra_compras SET status_pagamento = 'pago', updated_at = now()
    WHERE id = v_purchase.id;
  ELSIF p_obligation_type = 'invoice' THEN
    UPDATE public.obra_notas_fiscais
    SET status = 'Paga', data_pagamento = p_paid_at::DATE, conta_id = p_account_id::TEXT,
        forma_pagamento = trim(p_method), updated_at = now()
    WHERE id = v_nf.id;
  END IF;

  IF p_generate_commission THEN
    v_commission_key := CASE
      WHEN p_obligation_type IN ('purchase', 'purchase_installment') THEN format('purchase:%s', v_purchase.id)
      ELSE format('transaction:%s', v_transaction_id)
    END;

    IF p_obligation_type IN ('purchase', 'purchase_installment') THEN
      INSERT INTO public.obra_comissao_pagamentos(
        user_id, transacao_id, origem_compra_id, dedup_key, mes, valor, pago,
        auto, categoria, fornecedor, forma_pagamento, observacoes
      ) VALUES (
        v_user_id, v_transaction_id, v_purchase.id, v_commission_key,
        to_char(v_purchase.data::DATE, 'YYYY-MM'), ROUND(v_commission_base * 0.08, 2),
        false, true, COALESCE(v_category, 'Outro'), COALESCE(v_supplier, ''),
        trim(p_method), format('Comissão automática 8%% - %s', v_description)
      )
      ON CONFLICT (user_id, dedup_key) WHERE deleted_at IS NULL AND origem_compra_id IS NOT NULL AND dedup_key IS NOT NULL
      DO UPDATE SET dedup_key = EXCLUDED.dedup_key
      RETURNING id INTO v_commission_id;
    ELSE
      INSERT INTO public.obra_comissao_pagamentos(
        user_id, transacao_id, origem_compra_id, dedup_key, mes, valor, pago,
        auto, categoria, fornecedor, forma_pagamento, observacoes
      ) VALUES (
        v_user_id, v_transaction_id, NULL, v_commission_key,
        to_char(p_paid_at::DATE, 'YYYY-MM'), ROUND(v_commission_base * 0.08, 2),
        false, true, COALESCE(v_category, 'Outro'), COALESCE(v_supplier, ''),
        trim(p_method), format('Comissão automática 8%% - %s', v_description)
      )
      ON CONFLICT (user_id, dedup_key) WHERE deleted_at IS NULL AND origem_compra_id IS NULL AND transacao_id IS NOT NULL AND dedup_key IS NOT NULL
      DO UPDATE SET dedup_key = EXCLUDED.dedup_key
      RETURNING id INTO v_commission_id;
    END IF;

    IF v_commission_id IS NULL THEN
      SELECT id INTO v_commission_id FROM public.obra_comissao_pagamentos
      WHERE user_id = v_user_id AND dedup_key = v_commission_key AND deleted_at IS NULL LIMIT 1;
    END IF;
  END IF;

  v_result := jsonb_build_object(
    'operation_id', v_operation_id,
    'transaction_id', v_transaction_id,
    'commission_id', v_commission_id,
    'obligation_type', p_obligation_type,
    'obligation_id', p_obligation_id,
    'installment_number', p_installment_number,
    'paid_at', p_paid_at,
    'idempotent_replay', false
  );

  UPDATE public.obra_financial_payment_operations
  SET transaction_id = v_transaction_id, commission_id = v_commission_id, result = v_result
  WHERE id = v_operation_id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.pay_financial_obligation(TEXT, UUID, UUID, TEXT, TIMESTAMPTZ, BOOLEAN, TEXT, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pay_financial_obligation(TEXT, UUID, UUID, TEXT, TIMESTAMPTZ, BOOLEAN, TEXT, INTEGER, TEXT) TO authenticated;
