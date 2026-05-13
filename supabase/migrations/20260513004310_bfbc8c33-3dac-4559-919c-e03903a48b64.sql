
-- ===== Enum status =====
DO $$ BEGIN
  CREATE TYPE public.folha_pagamento_status AS ENUM ('rascunho','conferida','lancada','paga','cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== obra_mao_de_obra: CPF =====
ALTER TABLE public.obra_mao_de_obra
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS cpf_normalizado text;
CREATE INDEX IF NOT EXISTS idx_obra_mao_de_obra_cpf_norm
  ON public.obra_mao_de_obra(user_id, cpf_normalizado)
  WHERE cpf_normalizado IS NOT NULL AND deleted_at IS NULL;

-- ===== obra_folhas_pagamento =====
CREATE TABLE IF NOT EXISTS public.obra_folhas_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  competencia_mes text NOT NULL,
  titulo text NOT NULL DEFAULT '',
  obra_nome text NOT NULL DEFAULT '',
  data_fechamento text NOT NULL,
  status public.folha_pagamento_status NOT NULL DEFAULT 'rascunho',
  total_diarias numeric NOT NULL DEFAULT 0,
  total_quinzena numeric NOT NULL DEFAULT 0,
  total_vales numeric NOT NULL DEFAULT 0,
  total_alimentacao numeric NOT NULL DEFAULT 0,
  total_encerramento numeric NOT NULL DEFAULT 0,
  total_ferias_13 numeric NOT NULL DEFAULT 0,
  total_horas_extras numeric NOT NULL DEFAULT 0,
  total_funcionarios numeric NOT NULL DEFAULT 0,
  total_encargos numeric NOT NULL DEFAULT 0,
  total_geral numeric NOT NULL DEFAULT 0,
  diferenca_conferencia numeric NOT NULL DEFAULT 0,
  financeiro_transacao_id uuid,
  comissao_id uuid,
  gerar_comissao boolean NOT NULL DEFAULT true,
  origem text NOT NULL DEFAULT 'manual',
  observacoes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_obra_folhas_pagamento_competencia_ativa
  ON public.obra_folhas_pagamento(user_id, competencia_mes)
  WHERE deleted_at IS NULL AND status <> 'cancelada';

ALTER TABLE public.obra_folhas_pagamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fp_select_own" ON public.obra_folhas_pagamento FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fp_insert_own" ON public.obra_folhas_pagamento FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fp_update_own" ON public.obra_folhas_pagamento FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "fp_delete_own" ON public.obra_folhas_pagamento FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_fp_updated BEFORE UPDATE ON public.obra_folhas_pagamento
  FOR EACH ROW EXECUTE FUNCTION public.obra_handle_updated_at();

-- ===== obra_folha_pagamento_itens =====
CREATE TABLE IF NOT EXISTS public.obra_folha_pagamento_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  folha_id uuid NOT NULL REFERENCES public.obra_folhas_pagamento(id) ON DELETE CASCADE,
  trabalhador_id uuid,
  ref integer NOT NULL DEFAULT 0,
  nome text NOT NULL,
  cpf text NOT NULL DEFAULT '',
  funcao text NOT NULL DEFAULT '',
  qtd_diaria numeric NOT NULL DEFAULT 0,
  valor_diaria numeric NOT NULL DEFAULT 0,
  total_diarias numeric NOT NULL DEFAULT 0,
  quinzena numeric NOT NULL DEFAULT 0,
  vales numeric NOT NULL DEFAULT 0,
  alimentacao numeric NOT NULL DEFAULT 0,
  encerramento numeric NOT NULL DEFAULT 0,
  ferias_13 numeric NOT NULL DEFAULT 0,
  horas_extras numeric NOT NULL DEFAULT 0,
  total_geral numeric NOT NULL DEFAULT 0,
  observacoes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_fpi_folha ON public.obra_folha_pagamento_itens(folha_id) WHERE deleted_at IS NULL;
ALTER TABLE public.obra_folha_pagamento_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fpi_select_own" ON public.obra_folha_pagamento_itens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fpi_insert_own" ON public.obra_folha_pagamento_itens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fpi_update_own" ON public.obra_folha_pagamento_itens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "fpi_delete_own" ON public.obra_folha_pagamento_itens FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_fpi_updated BEFORE UPDATE ON public.obra_folha_pagamento_itens
  FOR EACH ROW EXECUTE FUNCTION public.obra_handle_updated_at();

-- ===== obra_folha_pagamento_encargos =====
CREATE TABLE IF NOT EXISTS public.obra_folha_pagamento_encargos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  folha_id uuid NOT NULL REFERENCES public.obra_folhas_pagamento(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  valor numeric NOT NULL DEFAULT 0,
  observacoes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_fpe_folha ON public.obra_folha_pagamento_encargos(folha_id) WHERE deleted_at IS NULL;
ALTER TABLE public.obra_folha_pagamento_encargos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fpe_select_own" ON public.obra_folha_pagamento_encargos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fpe_insert_own" ON public.obra_folha_pagamento_encargos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fpe_update_own" ON public.obra_folha_pagamento_encargos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "fpe_delete_own" ON public.obra_folha_pagamento_encargos FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_fpe_updated BEFORE UPDATE ON public.obra_folha_pagamento_encargos
  FOR EACH ROW EXECUTE FUNCTION public.obra_handle_updated_at();

-- ===== Helper: label competência =====
CREATE OR REPLACE FUNCTION public._folha_competencia_label(p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE substring(p from 6 for 2)
    WHEN '01' THEN 'janeiro' WHEN '02' THEN 'fevereiro' WHEN '03' THEN 'março'
    WHEN '04' THEN 'abril'  WHEN '05' THEN 'maio'      WHEN '06' THEN 'junho'
    WHEN '07' THEN 'julho'  WHEN '08' THEN 'agosto'    WHEN '09' THEN 'setembro'
    WHEN '10' THEN 'outubro' WHEN '11' THEN 'novembro' WHEN '12' THEN 'dezembro'
    ELSE substring(p from 6 for 2)
  END || '/' || substring(p from 1 for 4);
$$;

-- ===== RPC: lancar_folha_financeiro =====
CREATE OR REPLACE FUNCTION public.lancar_folha_financeiro(p_folha_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_folha record;
  v_ref text;
  v_existing uuid;
  v_tx_id uuid;
  v_com_id uuid;
  v_resumo text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;

  SELECT * INTO v_folha FROM obra_folhas_pagamento
   WHERE id = p_folha_id AND user_id = v_user AND deleted_at IS NULL FOR UPDATE;
  IF v_folha IS NULL THEN RAISE EXCEPTION 'folha não encontrada'; END IF;
  IF v_folha.status NOT IN ('rascunho','conferida') THEN
    RAISE EXCEPTION 'folha já lançada (status=%)', v_folha.status USING ERRCODE='23505';
  END IF;

  v_ref := 'FOLHA-' || replace(v_folha.competencia_mes,'-','-');

  SELECT id INTO v_existing FROM obra_transacoes_fluxo
   WHERE user_id = v_user AND referencia = v_ref AND deleted_at IS NULL LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'já existe lançamento com referência % (id=%)', v_ref, v_existing USING ERRCODE='23505';
  END IF;

  v_resumo := 'Folha de pagamento ' || _folha_competencia_label(v_folha.competencia_mes)
    || '. Funcionários: ' || v_folha.total_funcionarios::text
    || '. Total funcionários: R$ ' || to_char(v_folha.total_funcionarios,'FM999G999G990D00')
    || '. Encargos: R$ ' || to_char(v_folha.total_encargos,'FM999G999G990D00')
    || '. Detalhamento completo na aba Mão de Obra.';

  INSERT INTO obra_transacoes_fluxo
    (id, user_id, tipo, descricao, categoria, valor, data, forma_pagamento,
     observacoes, recorrencia, referencia, origem_tipo, origem_id, status)
  VALUES
    (gen_random_uuid(), v_user, 'Saída',
     'Folha de pagamento ' || _folha_competencia_label(v_folha.competencia_mes),
     'Mão de Obra', v_folha.total_geral, v_folha.data_fechamento, 'A Vista',
     v_resumo, 'Única', v_ref, 'folha_pagamento', p_folha_id::text, 'pendente')
  RETURNING id INTO v_tx_id;

  IF v_folha.gerar_comissao AND v_folha.total_geral > 0 THEN
    INSERT INTO obra_comissao_pagamentos
      (id, user_id, mes, data_pagamento, valor, pago, observacoes, auto, transacao_id, categoria, fornecedor, forma_pagamento)
    VALUES
      (gen_random_uuid(), v_user, v_folha.competencia_mes, v_folha.data_fechamento,
       round(v_folha.total_geral * 0.08, 2), false,
       'Comissão 8% folha ' || v_folha.competencia_mes, true, v_tx_id,
       'Mão de Obra', 'Folha de pagamento', 'A Vista')
    RETURNING id INTO v_com_id;
  END IF;

  UPDATE obra_folhas_pagamento
    SET status='lancada', financeiro_transacao_id=v_tx_id, comissao_id=v_com_id
    WHERE id = p_folha_id;

  RETURN jsonb_build_object('transacao_id', v_tx_id, 'comissao_id', v_com_id, 'referencia', v_ref);
END $$;

-- ===== RPC: marcar_folha_paga =====
CREATE OR REPLACE FUNCTION public.marcar_folha_paga(p_folha_id uuid, p_data text, p_conta_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_folha record;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_folha FROM obra_folhas_pagamento
   WHERE id = p_folha_id AND user_id = v_user AND deleted_at IS NULL FOR UPDATE;
  IF v_folha IS NULL THEN RAISE EXCEPTION 'folha não encontrada'; END IF;
  IF v_folha.financeiro_transacao_id IS NULL THEN
    RAISE EXCEPTION 'folha ainda não foi lançada no financeiro';
  END IF;

  UPDATE obra_transacoes_fluxo
    SET status='pago', data_pagamento = COALESCE(p_data, data_fechamento_), conta_id = COALESCE(p_conta_id, conta_id)
  WHERE id = v_folha.financeiro_transacao_id AND user_id = v_user;

  UPDATE obra_folhas_pagamento SET status='paga' WHERE id = p_folha_id;
  RETURN jsonb_build_object('ok', true);
END $$;

-- ===== RPC: reabrir_folha =====
CREATE OR REPLACE FUNCTION public.reabrir_folha(p_folha_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_folha record;
  v_tx record;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_folha FROM obra_folhas_pagamento
   WHERE id = p_folha_id AND user_id = v_user AND deleted_at IS NULL FOR UPDATE;
  IF v_folha IS NULL THEN RAISE EXCEPTION 'folha não encontrada'; END IF;
  IF v_folha.status = 'paga' THEN
    RAISE EXCEPTION 'folha já paga não pode ser reaberta';
  END IF;

  IF v_folha.financeiro_transacao_id IS NOT NULL THEN
    SELECT * INTO v_tx FROM obra_transacoes_fluxo WHERE id = v_folha.financeiro_transacao_id;
    IF v_tx.status = 'pago' THEN
      RAISE EXCEPTION 'transação já paga não pode ser removida';
    END IF;
    UPDATE obra_transacoes_fluxo SET deleted_at = now() WHERE id = v_folha.financeiro_transacao_id;
  END IF;
  IF v_folha.comissao_id IS NOT NULL THEN
    UPDATE obra_comissao_pagamentos SET deleted_at = now() WHERE id = v_folha.comissao_id;
  END IF;

  UPDATE obra_folhas_pagamento
    SET status='rascunho', financeiro_transacao_id = NULL, comissao_id = NULL
    WHERE id = p_folha_id;
  RETURN jsonb_build_object('ok', true);
END $$;
