-- ============================================================
-- Migration: Sistema de Contas a Pagar
-- Adiciona controle de status de pagamento nas transacoes
-- ============================================================

-- 1. Novas colunas
ALTER TABLE public.obra_transacoes_fluxo
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS data_vencimento DATE,
  ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS comprovante_path TEXT,
  ADD COLUMN IF NOT EXISTS parcela_numero INTEGER,
  ADD COLUMN IF NOT EXISTS parcela_total INTEGER;

-- 2. Backfill: todas as transacoes existentes sao pagamentos ja concluidos
UPDATE public.obra_transacoes_fluxo
  SET status = 'pago',
      data_pagamento = created_at
  WHERE status = 'pendente'
    AND deleted_at IS NULL;

-- 3. Indexes para performance
CREATE INDEX IF NOT EXISTS idx_transacoes_status_vencimento
  ON public.obra_transacoes_fluxo (status, data_vencimento)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transacoes_grupo
  ON public.obra_transacoes_fluxo (recorrencia_grupo_id)
  WHERE recorrencia_grupo_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transacoes_status
  ON public.obra_transacoes_fluxo (status)
  WHERE deleted_at IS NULL;

-- 4. Habilitar realtime para a tabela (caso ainda nao esteja)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.obra_transacoes_fluxo;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
