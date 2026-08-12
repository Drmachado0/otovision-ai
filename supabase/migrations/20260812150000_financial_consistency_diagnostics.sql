-- Relatório agregado e tenant-safe; não altera nem expõe registros individuais.
CREATE OR REPLACE FUNCTION public.financial_consistency_report()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_report JSONB;
BEGIN
  IF v_user IS NULL OR NOT public.fin_can_write() THEN
    RAISE EXCEPTION 'Sem permissão para consultar consistência financeira' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'generated_at', now(),
    'noncanonical_statuses', (
      SELECT count(*) FROM public.obra_transacoes_fluxo
      WHERE user_id = v_user AND deleted_at IS NULL
        AND lower(status) NOT IN ('pago', 'pendente', 'cancelado')
    ),
    'transactions_without_account', (
      SELECT count(*) FROM public.obra_transacoes_fluxo
      WHERE user_id = v_user AND deleted_at IS NULL AND conta_id IS NULL
    ),
    'legacy_origin_duplicate_groups', (
      SELECT count(*) FROM (
        SELECT origem_tipo, origem_id
        FROM public.obra_transacoes_fluxo
        WHERE user_id = v_user AND deleted_at IS NULL
          AND origem_tipo IS NOT NULL AND btrim(origem_tipo) <> ''
          AND origem_id IS NOT NULL AND btrim(origem_id) <> ''
          AND origem_tipo NOT IN ('compra', 'compra_parcela', 'nf', 'movimentacao_extraida')
        GROUP BY origem_tipo, origem_id HAVING count(*) > 1
      ) duplicate_groups
    ),
    'installments_without_transaction', (
      SELECT count(*)
      FROM public.obra_compras purchase
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(purchase.parcelas::JSONB, '[]'::JSONB)) installment
      WHERE purchase.user_id = v_user AND purchase.deleted_at IS NULL
        AND lower(COALESCE(installment->>'status', '')) = 'paga'
        AND NOT EXISTS (
          SELECT 1 FROM public.obra_transacoes_fluxo transaction
          WHERE transaction.user_id = v_user AND transaction.deleted_at IS NULL
            AND transaction.origem_tipo = 'compra_parcela'
            AND transaction.origem_id = format('%s:%s', purchase.id, installment->>'numero')
            AND lower(transaction.status) = 'pago'
        )
    ),
    'commission_duplicate_groups', (
      SELECT count(*) FROM (
        SELECT COALESCE(origem_compra_id::TEXT, transacao_id::TEXT) origin
        FROM public.obra_comissao_pagamentos
        WHERE user_id = v_user AND deleted_at IS NULL
          AND (origem_compra_id IS NOT NULL OR transacao_id IS NOT NULL)
        GROUP BY COALESCE(origem_compra_id::TEXT, transacao_id::TEXT) HAVING count(*) > 1
      ) duplicate_commissions
    ),
    'orphan_commissions', (
      SELECT count(*) FROM public.obra_comissao_pagamentos commission
      WHERE commission.user_id = v_user AND commission.deleted_at IS NULL
        AND (
          (commission.origem_compra_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM public.obra_compras purchase
            WHERE purchase.id = commission.origem_compra_id AND purchase.user_id = v_user AND purchase.deleted_at IS NULL
          )) OR
          (commission.origem_compra_id IS NULL AND commission.transacao_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM public.obra_transacoes_fluxo transaction
            WHERE transaction.id = commission.transacao_id AND transaction.user_id = v_user AND transaction.deleted_at IS NULL
          ))
        )
    ),
    'ofx_missing_fitid', (
      SELECT count(*) FROM public.obra_movimentacoes_extraidas
      WHERE user_id = v_user AND conta_id IS NOT NULL
        AND (extrato_fit_id IS NULL OR btrim(extrato_fit_id) = '')
    ),
    'reconciliation_value_mismatches', (
      SELECT count(*)
      FROM public.obra_conciliacoes_bancarias reconciliation
      JOIN public.obra_movimentacoes_extraidas movement ON movement.id = reconciliation.movimentacao_extraida_id
      JOIN public.obra_transacoes_fluxo transaction ON transaction.id = reconciliation.transacao_id
      WHERE reconciliation.user_id = v_user
        AND reconciliation.status_conciliacao = 'conciliado'
        AND movement.valor <> transaction.valor
    ),
    'reconciliation_account_mismatches', (
      SELECT count(*)
      FROM public.obra_conciliacoes_bancarias reconciliation
      JOIN public.obra_movimentacoes_extraidas movement ON movement.id = reconciliation.movimentacao_extraida_id
      JOIN public.obra_transacoes_fluxo transaction ON transaction.id = reconciliation.transacao_id
      WHERE reconciliation.user_id = v_user
        AND reconciliation.status_conciliacao = 'conciliado'
        AND movement.conta_id::TEXT IS DISTINCT FROM transaction.conta_id::TEXT
    )
  ) INTO v_report;

  RETURN v_report;
END;
$$;

REVOKE ALL ON FUNCTION public.financial_consistency_report() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.financial_consistency_report() TO authenticated;
