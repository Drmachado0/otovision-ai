-- Proteções de banco contra duplicidade de lançamentos financeiros.
-- A camada de aplicação já faz deduplicação semântica por data/tipo/valor/descrição.
-- Estes índices reforçam os casos com chaves estáveis de origem/referência.

-- Uma referência operacional não deve gerar mais de uma transação ativa por usuário.
-- Exemplos: COMPRA-<id>, COMPRA-<id>-PARCELA-<n>, NF-<id>.
CREATE UNIQUE INDEX IF NOT EXISTS idx_obra_transacoes_fluxo_referencia_ativa_unica
  ON public.obra_transacoes_fluxo (user_id, referencia)
  WHERE deleted_at IS NULL
    AND referencia IS NOT NULL
    AND btrim(referencia) <> '';

-- Uma origem externa estruturada não deve gerar mais de uma transação ativa por usuário.
-- Exemplo: integrações futuras que preencham origem_tipo + origem_id de forma estável.
CREATE UNIQUE INDEX IF NOT EXISTS idx_obra_transacoes_fluxo_origem_ativa_unica
  ON public.obra_transacoes_fluxo (user_id, origem_tipo, origem_id)
  WHERE deleted_at IS NULL
    AND origem_tipo IS NOT NULL
    AND btrim(origem_tipo) <> ''
    AND origem_id IS NOT NULL
    AND btrim(origem_id) <> '';

-- Uma movimentação extraída aprovada deve ficar vinculada a uma única transação ativa.
CREATE UNIQUE INDEX IF NOT EXISTS idx_obra_movimentacoes_extraidas_transacao_unica
  ON public.obra_movimentacoes_extraidas (user_id, transacao_id)
  WHERE transacao_id IS NOT NULL;
