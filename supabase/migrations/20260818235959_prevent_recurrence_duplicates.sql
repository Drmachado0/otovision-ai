-- Migration: prevenir duplicatas em recorrências
-- Data: 2026-08-18
-- Problema: processRecurrences() insere sem verificar duplicata

-- 1) Índice único para impedir duplicata por grupo+vencimento
-- Permite apenas 1 ocorrência ativa (não-cancelada) por grupo por data
CREATE UNIQUE INDEX IF NOT EXISTS idx_obra_transacoes_recorrencia_unica
ON public.obra_transacoes_fluxo (recorrencia_grupo_id, data_vencimento)
WHERE recorrencia_grupo_id IS NOT NULL
  AND deleted_at IS NULL
  AND status <> 'cancelado';

-- 2) Índice para acelerar busca de última ocorrência do grupo
CREATE INDEX IF NOT EXISTS idx_obra_transacoes_recorrencia_grupo
ON public.obra_transacoes_fluxo (recorrencia_grupo_id, data_vencimento DESC)
WHERE recorrencia_grupo_id IS NOT NULL AND deleted_at IS NULL;

-- 3) Comentário documentando a regra
COMMENT ON INDEX idx_obra_transacoes_recorrencia_unica IS
'Previne duplicatas: apenas 1 ocorrência ativa (pendente/pago) por grupo de recorrência por data de vencimento. Canceladas são ignoradas.';
