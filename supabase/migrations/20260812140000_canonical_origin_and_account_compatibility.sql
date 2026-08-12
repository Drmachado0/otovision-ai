-- Unicidade somente para origens canônicas novas. Duplicidades legadas são
-- preservadas para reconciliação explícita, sem apagar ou ocultar histórico.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.obra_transacoes_fluxo
    WHERE deleted_at IS NULL
      AND origem_tipo IN ('compra', 'compra_parcela', 'nf', 'movimentacao_extraida')
      AND origem_id IS NOT NULL AND btrim(origem_id) <> ''
    GROUP BY user_id, origem_tipo, origem_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicatas canônicas de origem precisam ser reconciliadas antes da migration';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_obra_transacoes_origem_canonica
  ON public.obra_transacoes_fluxo(user_id, origem_tipo, origem_id)
  WHERE deleted_at IS NULL
    AND origem_tipo IN ('compra', 'compra_parcela', 'nf', 'movimentacao_extraida')
    AND origem_id IS NOT NULL AND btrim(origem_id) <> '';

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
  v_updated_installments JSONB;
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
      SELECT item INTO v_installment
      FROM jsonb_array_elements(COALESCE(v_purchase.parcelas::JSONB, '[]'::JSONB)) AS item
      WHERE (item->>'numero')::INTEGER = p_installment_number;
      IF v_installment IS NULL THEN RAISE EXCEPTION 'Parcela não encontrada' USING ERRCODE = 'P0002'; END IF;
      IF lower(COALESCE(v_installment->>'status', '')) <> 'pendente' THEN
        RAISE EXCEPTION 'Parcela não está pendente' USING ERRCODE = '23514';
      END IF;
      v_value := (v_installment->>'valor')::NUMERIC;
      v_description := format('Parcela %s/%s - %s', p_installment_number, v_purchase.numero_parcelas,
        COALESCE(NULLIF(v_purchase.descricao, ''), v_purchase.fornecedor));
    ELSE
      IF jsonb_array_length(COALESCE(v_purchase.parcelas::JSONB, '[]'::JSONB)) > 1
         OR COALESCE(v_purchase.numero_parcelas, 1) > 1 THEN
        RAISE EXCEPTION 'Compra parcelada deve ser paga por parcela' USING ERRCODE = '22023';
      END IF;
      IF lower(COALESCE(v_purchase.status_entrega, '')) IN ('entregue', 'cancelado') THEN
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
    INSERT INTO public.obra_transacoes_fluxo(
      user_id, tipo, valor, data, data_vencimento, data_pagamento, categoria,
      descricao, forma_pagamento, metodo_pagamento, conta_id, recorrencia,
      referencia, observacoes, origem_tipo, origem_id, status, comprovante_path,
      parcela_numero, parcela_total
    ) VALUES (
      v_user_id, 'Saída', v_value, (p_paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE,
      CASE WHEN p_obligation_type = 'purchase_installment' THEN (v_installment->>'data_vencimento')::DATE
           WHEN p_obligation_type = 'invoice' THEN NULLIF(v_nf.data_vencimento, '')::DATE ELSE NULL END,
      p_paid_at, v_category, v_description, trim(p_method), trim(p_method), p_account_id::TEXT,
      'Única', v_reference, format('Pagamento atômico da obrigação %s', p_obligation_id),
      v_origin_type, v_origin_id, 'pago', p_receipt_path,
      p_installment_number,
      CASE WHEN p_obligation_type = 'purchase_installment' THEN v_purchase.numero_parcelas ELSE NULL END
    )
    ON CONFLICT (user_id, origem_tipo, origem_id) WHERE deleted_at IS NULL
      AND origem_tipo IN ('compra', 'compra_parcela', 'nf', 'movimentacao_extraida')
      AND origem_id IS NOT NULL AND btrim(origem_id) <> ''
    DO UPDATE SET id = public.obra_transacoes_fluxo.id
    RETURNING id INTO v_transaction_id;
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
        status_entrega = CASE
          WHEN NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(v_updated_installments) item
            WHERE lower(COALESCE(item->>'status', '')) <> 'paga'
          ) THEN 'Entregue' ELSE status_entrega END,
        updated_at = now()
    WHERE id = v_purchase.id;
  ELSIF p_obligation_type = 'purchase' THEN
    UPDATE public.obra_compras SET status_entrega = 'Entregue', updated_at = now()
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
REVOKE ALL ON FUNCTION public.pay_financial_obligation(TEXT, UUID, UUID, TEXT, TIMESTAMPTZ, BOOLEAN, TEXT, INTEGER, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.pay_financial_obligation(TEXT, UUID, UUID, TEXT, TIMESTAMPTZ, BOOLEAN, TEXT, INTEGER, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_extracted_movement(
  p_movement_id UUID,
  p_type TEXT,
  p_value NUMERIC,
  p_date DATE,
  p_category TEXT,
  p_description TEXT,
  p_account_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_movement public.obra_movimentacoes_extraidas%ROWTYPE;
  v_transaction_id UUID;
  v_status TEXT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501'; END IF;
  IF NOT public.fin_can_write() THEN RAISE EXCEPTION 'Sem permissão para aprovar movimentação' USING ERRCODE = '42501'; END IF;
  IF p_type NOT IN ('Entrada', 'Saída') OR p_value <= 0 OR p_date IS NULL OR btrim(COALESCE(p_description, '')) = '' THEN
    RAISE EXCEPTION 'Dados financeiros inválidos' USING ERRCODE = '22023';
  END IF;
  IF p_account_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.obra_contas_financeiras
    WHERE id = p_account_id AND user_id = v_user AND ativa IS TRUE
  ) THEN
    RAISE EXCEPTION 'Conta não pertence ao usuário' USING ERRCODE = '23503';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user::TEXT || ':movement-approval:' || p_movement_id::TEXT, 0));
  SELECT mov.* INTO v_movement
  FROM public.obra_movimentacoes_extraidas mov
  WHERE mov.id = p_movement_id AND mov.user_id = v_user
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Movimentação não encontrada' USING ERRCODE = 'P0002'; END IF;

  IF v_movement.transacao_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.obra_transacoes_fluxo tx
      WHERE tx.id = v_movement.transacao_id AND tx.user_id = v_user AND tx.deleted_at IS NULL
    ) THEN
      RETURN jsonb_build_object(
        'success', true, 'transaction_id', v_movement.transacao_id,
        'movement_id', p_movement_id, 'idempotent_replay', true
      );
    END IF;
    RAISE EXCEPTION 'Movimentação vinculada a transação inválida' USING ERRCODE = '23503';
  END IF;

  v_status := CASE WHEN p_type = 'Entrada' THEN 'pago' ELSE 'pendente' END;
  INSERT INTO public.obra_transacoes_fluxo(
    user_id, tipo, valor, data, data_vencimento, data_pagamento,
    categoria, descricao, forma_pagamento, recorrencia, referencia,
    conta_id, status, origem_tipo, origem_id, observacoes
  ) VALUES (
    v_user, p_type, p_value, p_date,
    CASE WHEN p_type = 'Saída' THEN p_date ELSE NULL END,
    CASE WHEN p_type = 'Entrada' THEN p_date::TIMESTAMPTZ ELSE NULL END,
    COALESCE(NULLIF(btrim(p_category), ''), 'Outro'), btrim(p_description),
    '', 'Única', '', p_account_id, v_status, 'movimentacao_extraida',
    p_movement_id::TEXT, 'Obrigação reconhecida a partir de documento; pagamento pendente'
  )
  ON CONFLICT (user_id, origem_tipo, origem_id) WHERE deleted_at IS NULL
    AND origem_tipo IN ('compra', 'compra_parcela', 'nf', 'movimentacao_extraida')
    AND origem_id IS NOT NULL AND btrim(origem_id) <> ''
  DO UPDATE SET id = public.obra_transacoes_fluxo.id
  RETURNING id INTO v_transaction_id;

  UPDATE public.obra_movimentacoes_extraidas
  SET status_revisao = 'aprovado', transacao_id = v_transaction_id,
      data_movimentacao = p_date, valor = p_value, tipo_movimentacao = p_type,
      categoria_sugerida = COALESCE(NULLIF(btrim(p_category), ''), 'Outro'),
      descricao = btrim(p_description)
  WHERE id = p_movement_id AND user_id = v_user;

  RETURN jsonb_build_object(
    'success', true, 'transaction_id', v_transaction_id,
    'movement_id', p_movement_id, 'status', v_status,
    'idempotent_replay', false, 'commission_created', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_extracted_movement(UUID, TEXT, NUMERIC, DATE, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_extracted_movement(UUID, TEXT, NUMERIC, DATE, TEXT, TEXT, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.reconcile_bank_movement(
  p_movement_id UUID,
  p_transaction_id UUID,
  p_generate_commission BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_movement public.obra_movimentacoes_extraidas%ROWTYPE;
  v_transaction public.obra_transacoes_fluxo%ROWTYPE;
  v_existing public.obra_conciliacoes_bancarias%ROWTYPE;
  v_payment JSONB;
  v_conciliation_id UUID;
  v_idempotency_key TEXT;
  v_paid_at TIMESTAMPTZ;
  v_replay BOOLEAN := false;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;
  IF NOT public.fin_can_write() THEN
    RAISE EXCEPTION 'Sem permissão para conciliar' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user::TEXT || ':bank-movement:' || p_movement_id::TEXT, 0));

  SELECT mov.* INTO v_movement
  FROM public.obra_movimentacoes_extraidas mov
  WHERE mov.id = p_movement_id AND mov.user_id = v_user
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Movimentação bancária não encontrada' USING ERRCODE = 'P0002';
  END IF;
  IF v_movement.conta_id IS NULL THEN
    RAISE EXCEPTION 'Movimentação sem conta bancária' USING ERRCODE = '23514';
  END IF;
  IF NULLIF(btrim(v_movement.extrato_fit_id), '') IS NULL THEN
    RAISE EXCEPTION 'Movimentação sem FITID' USING ERRCODE = '23514';
  END IF;

  SELECT tx.* INTO v_transaction
  FROM public.obra_transacoes_fluxo tx
  WHERE tx.id = p_transaction_id AND tx.user_id = v_user AND tx.deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Obrigação financeira não encontrada' USING ERRCODE = 'P0002';
  END IF;
  IF lower(v_movement.tipo_movimentacao) NOT IN ('saída', 'saida')
     OR lower(v_transaction.tipo) NOT IN ('saída', 'saida') THEN
    RAISE EXCEPTION 'Conciliação implementada somente para saídas' USING ERRCODE = '22023';
  END IF;
  IF v_transaction.conta_id IS NOT NULL AND v_transaction.conta_id::TEXT <> v_movement.conta_id::TEXT THEN
    RAISE EXCEPTION 'Conta da movimentação diverge da conta selecionada' USING ERRCODE = '23514';
  END IF;
  IF round(v_movement.valor, 2) IS DISTINCT FROM round(v_transaction.valor, 2) THEN
    RAISE EXCEPTION 'Valor da movimentação diverge da obrigação' USING ERRCODE = '23514';
  END IF;

  SELECT c.* INTO v_existing
  FROM public.obra_conciliacoes_bancarias c
  WHERE c.movimentacao_extraida_id = p_movement_id
    AND c.status_conciliacao NOT IN ('desfeita', 'ignorado_temporariamente')
  FOR UPDATE;
  IF FOUND THEN
    IF v_existing.user_id <> v_user OR v_existing.transacao_id IS DISTINCT FROM p_transaction_id THEN
      RAISE EXCEPTION 'Movimentação já conciliada com outra transação' USING ERRCODE = '23505';
    END IF;
    RETURN jsonb_build_object(
      'success', true,
      'conciliation_id', v_existing.id,
      'transaction_id', p_transaction_id,
      'movement_id', p_movement_id,
      'extrato_fit_id', v_movement.extrato_fit_id,
      'idempotent_replay', true
    );
  END IF;

  v_idempotency_key := left(format('bank:%s:%s', v_movement.conta_id, v_movement.extrato_fit_id), 200);
  v_paid_at := (v_movement.data_movimentacao::DATE + time '12:00') AT TIME ZONE 'America/Sao_Paulo';

  IF lower(COALESCE(v_transaction.status, 'pendente')) <> 'pago' THEN
    v_payment := public.pay_financial_obligation(
      'transaction', p_transaction_id, v_movement.conta_id,
      'Conciliação OFX', v_paid_at, p_generate_commission,
      v_idempotency_key, NULL, NULL
    );
  ELSE
    IF v_transaction.conta_id::TEXT IS DISTINCT FROM v_movement.conta_id::TEXT THEN
      RAISE EXCEPTION 'Conta da movimentação diverge da conta selecionada' USING ERRCODE = '23514';
    END IF;
    v_payment := jsonb_build_object(
      'transaction_id', p_transaction_id,
      'already_paid', true,
      'idempotent_replay', false
    );
  END IF;

  INSERT INTO public.obra_conciliacoes_bancarias(
    user_id, movimentacao_extraida_id, transacao_id, status_conciliacao,
    score_compatibilidade, tipo_conciliacao, motivo_matching, observacoes,
    conciliado_por, conciliado_em
  ) VALUES (
    v_user, p_movement_id, p_transaction_id, 'conciliado',
    100, 'manual_exata', 'Conta e valor exatos; confirmação explícita do usuário',
    format('FITID %s', v_movement.extrato_fit_id), v_user, now()
  )
  ON CONFLICT (movimentacao_extraida_id)
    WHERE status_conciliacao NOT IN ('desfeita', 'ignorado_temporariamente')
  DO UPDATE SET transacao_id = EXCLUDED.transacao_id
  WHERE public.obra_conciliacoes_bancarias.user_id = v_user
    AND public.obra_conciliacoes_bancarias.transacao_id = EXCLUDED.transacao_id
  RETURNING id INTO v_conciliation_id;

  IF v_conciliation_id IS NULL THEN
    RAISE EXCEPTION 'Movimentação já conciliada com outra transação' USING ERRCODE = '23505';
  END IF;

  UPDATE public.obra_movimentacoes_extraidas
  SET status_revisao = 'aprovado', transacao_id = p_transaction_id
  WHERE id = p_movement_id AND user_id = v_user;

  UPDATE public.obra_transacoes_fluxo
  SET conciliado = true, updated_at = now()
  WHERE id = p_transaction_id AND user_id = v_user;

  INSERT INTO public.obra_eventos_conciliacao(
    user_id, conciliacao_id, acao, detalhes
  ) VALUES (
    v_user, v_conciliation_id, 'conciliacao_manual_exata',
    jsonb_build_object(
      'movimentacao_extraida_id', p_movement_id,
      'transacao_id', p_transaction_id,
      'conta_id', v_movement.conta_id,
      'extrato_fit_id', v_movement.extrato_fit_id,
      'valor', v_movement.valor
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'conciliation_id', v_conciliation_id,
    'transaction_id', p_transaction_id,
    'movement_id', p_movement_id,
    'extrato_fit_id', v_movement.extrato_fit_id,
    'payment', v_payment,
    'idempotent_replay', v_replay
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_bank_movement(UUID, UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reconcile_bank_movement(UUID, UUID, BOOLEAN) TO authenticated;
