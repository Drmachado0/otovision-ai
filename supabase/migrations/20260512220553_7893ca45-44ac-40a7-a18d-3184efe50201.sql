ALTER TABLE public.obra_mao_de_obra
  ADD COLUMN IF NOT EXISTS aliquota_fgts numeric NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS aliquota_inss numeric NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS incide_encargos boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.obra_mao_obra_folha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mes_ref text NOT NULL,
  total_diarias numeric NOT NULL DEFAULT 0,
  total_fgts numeric NOT NULL DEFAULT 0,
  total_inss numeric NOT NULL DEFAULT 0,
  detalhes jsonb NOT NULL DEFAULT '[]'::jsonb,
  transacao_fgts_id uuid,
  transacao_inss_id uuid,
  status text NOT NULL DEFAULT 'lancada',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT obra_mao_obra_folha_user_mes_unique UNIQUE (user_id, mes_ref)
);

ALTER TABLE public.obra_mao_obra_folha ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own folha" ON public.obra_mao_obra_folha
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own folha" ON public.obra_mao_obra_folha
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own folha" ON public.obra_mao_obra_folha
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own folha" ON public.obra_mao_obra_folha
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER obra_mao_obra_folha_updated_at
  BEFORE UPDATE ON public.obra_mao_obra_folha
  FOR EACH ROW EXECUTE FUNCTION public.obra_handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_obra_mao_obra_folha_user_mes
  ON public.obra_mao_obra_folha (user_id, mes_ref);