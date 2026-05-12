ALTER TABLE public.obra_mao_obra_folha_item
  ADD COLUMN IF NOT EXISTS fgts numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inss numeric NOT NULL DEFAULT 0;