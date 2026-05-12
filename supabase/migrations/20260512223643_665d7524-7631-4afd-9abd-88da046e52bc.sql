
-- Tabela de lançamentos manuais por trabalhador / mês
CREATE TABLE public.obra_mao_obra_folha_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trabalhador_id uuid NOT NULL,
  mes_ref text NOT NULL,
  quinzena numeric NOT NULL DEFAULT 0,
  vales numeric NOT NULL DEFAULT 0,
  vale_alimentacao numeric NOT NULL DEFAULT 0,
  encerramento numeric NOT NULL DEFAULT 0,
  ferias_decimo numeric NOT NULL DEFAULT 0,
  horas_extras numeric NOT NULL DEFAULT 0,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (user_id, trabalhador_id, mes_ref)
);

ALTER TABLE public.obra_mao_obra_folha_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own select" ON public.obra_mao_obra_folha_item FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.obra_mao_obra_folha_item FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.obra_mao_obra_folha_item FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.obra_mao_obra_folha_item FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_obra_mao_obra_folha_item
BEFORE UPDATE ON public.obra_mao_obra_folha_item
FOR EACH ROW EXECUTE FUNCTION public.obra_handle_updated_at();

-- Campos extras na folha do mês
ALTER TABLE public.obra_mao_obra_folha
  ADD COLUMN IF NOT EXISTS custos_engenharia numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS exames numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_quinzena numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_vales numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_vale_alim numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_encerramento numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_ferias numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_horas_extras numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_geral numeric NOT NULL DEFAULT 0;
