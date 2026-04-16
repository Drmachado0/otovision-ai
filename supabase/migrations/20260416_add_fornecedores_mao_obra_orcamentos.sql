-- ============================================================
-- Migration: Fornecedores, Mão de Obra, Orçamentos
-- ============================================================

-- 1. Fornecedores
CREATE TABLE IF NOT EXISTS public.obra_fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  cnpj TEXT DEFAULT '',
  telefone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  endereco TEXT DEFAULT '',
  banco TEXT DEFAULT '',
  agencia TEXT DEFAULT '',
  conta TEXT DEFAULT '',
  pix TEXT DEFAULT '',
  tipo_pix TEXT DEFAULT '',
  avaliacao INTEGER DEFAULT 0,
  observacoes TEXT DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.obra_fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own fornecedores" ON public.obra_fornecedores
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Mão de Obra
CREATE TABLE IF NOT EXISTS public.obra_mao_de_obra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  funcao TEXT DEFAULT '',
  telefone TEXT DEFAULT '',
  valor_diaria NUMERIC NOT NULL DEFAULT 0,
  valor_hora NUMERIC DEFAULT 0,
  tipo_contrato TEXT DEFAULT 'Diária',
  etapa_id UUID,
  ativo BOOLEAN NOT NULL DEFAULT true,
  data_inicio TEXT DEFAULT '',
  data_fim TEXT DEFAULT '',
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.obra_mao_de_obra ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own mao_de_obra" ON public.obra_mao_de_obra
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Registros diários de mão de obra
CREATE TABLE IF NOT EXISTS public.obra_mao_obra_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  trabalhador_id UUID NOT NULL REFERENCES public.obra_mao_de_obra(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  horas NUMERIC NOT NULL DEFAULT 8,
  valor NUMERIC NOT NULL DEFAULT 0,
  etapa TEXT DEFAULT '',
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.obra_mao_obra_registros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own registros" ON public.obra_mao_obra_registros
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Orçamentos
CREATE TABLE IF NOT EXISTS public.obra_orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  fornecedor TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  categoria TEXT DEFAULT '',
  valor_total NUMERIC NOT NULL DEFAULT 0,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  validade DATE,
  status TEXT NOT NULL DEFAULT 'Pendente',
  condicoes_pagamento TEXT DEFAULT '',
  observacoes TEXT DEFAULT '',
  itens JSONB DEFAULT '[]'::jsonb,
  aprovado_por TEXT DEFAULT '',
  aprovado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.obra_orcamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own orcamentos" ON public.obra_orcamentos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_fornecedores_user ON public.obra_fornecedores(user_id);
CREATE INDEX IF NOT EXISTS idx_mao_obra_user ON public.obra_mao_de_obra(user_id);
CREATE INDEX IF NOT EXISTS idx_mao_obra_registros_trab ON public.obra_mao_obra_registros(trabalhador_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_user ON public.obra_orcamentos(user_id);

-- 6. Realtime
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.obra_fornecedores; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.obra_mao_de_obra; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.obra_mao_obra_registros; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.obra_orcamentos; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
