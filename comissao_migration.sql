-- Adicionar coluna origem_compra_id para facilitar rastreamento de comissões de compras parceladas
ALTER TABLE public.obra_comissao_pagamentos ADD COLUMN IF NOT EXISTS origem_compra_id uuid REFERENCES public.obra_compras(id) ON DELETE SET NULL;

-- Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_comissao_origem_compra ON public.obra_comissao_pagamentos(origem_compra_id) WHERE deleted_at IS NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.obra_comissao_pagamentos.origem_compra_id IS 'ID da compra original para comissões únicas de compras parceladas';
