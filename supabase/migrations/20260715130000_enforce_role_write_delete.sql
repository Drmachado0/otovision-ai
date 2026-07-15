-- Reforça no BACKEND (RLS) as permissões de escrita/exclusão que hoje só existem
-- no client (src/hooks/useUserRole.ts). Antes desta migration, um usuário com role
-- read-only (construtor/visualizador) podia inserir/editar/apagar seus próprios
-- registros financeiros chamando o client Supabase direto, contornando a UI.
--
-- Modelo (espelha useUserRole.ts, com todos os usuários já tendo role atribuído):
--   * escrita (INSERT/UPDATE): admin + financeiro
--   * escrita em comissão:      admin apenas (financeiro não edita comissão)
--   * exclusão (DELETE):        admin apenas
--
-- Implementação via políticas RESTRICTIVE: elas são combinadas com AND às
-- políticas permissivas existentes (auth.uid() = user_id), então NÃO precisamos
-- dropar/reescrever as políticas atuais. O service_role (edge functions de
-- backup/importação) ignora RLS e continua funcionando normalmente.

-- ── Helpers (SECURITY DEFINER para ler user_roles, que tem RLS própria) ──

CREATE OR REPLACE FUNCTION public.fin_can_write()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'financeiro')
  );
$$;

CREATE OR REPLACE FUNCTION public.fin_can_write_comissao()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.fin_can_delete()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- ── Aplica políticas restritivas a todas as tabelas obra_* de dados do usuário ──
-- (descoberta dinâmica: relkind = tabela, RLS ligado, tem coluna user_id).
-- Exclui:
--   obra_audit_log     -> trilha imutável, já protegida separadamente
--   obra_notificacoes  -> gerada programaticamente pelo client (useAutoNotifications)
--                         inclusive para usuários read-only; não é dado financeiro.
--   obra_comissao_pagamentos -> tratada logo abaixo com regra admin-only.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = true
      AND c.relname LIKE 'obra_%'
      AND c.relname NOT IN ('obra_audit_log', 'obra_notificacoes', 'obra_comissao_pagamentos')
      AND EXISTS (
        SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = c.oid AND a.attname = 'user_id' AND NOT a.attisdropped
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS fin_require_write_insert ON public.%I', r.relname);
    EXECUTE format('CREATE POLICY fin_require_write_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.fin_can_write())', r.relname);

    EXECUTE format('DROP POLICY IF EXISTS fin_require_write_update ON public.%I', r.relname);
    EXECUTE format('CREATE POLICY fin_require_write_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.fin_can_write())', r.relname);

    EXECUTE format('DROP POLICY IF EXISTS fin_require_delete ON public.%I', r.relname);
    EXECUTE format('CREATE POLICY fin_require_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (public.fin_can_delete())', r.relname);
  END LOOP;
END $$;

-- ── Comissão: escrita restrita a admin ──
DROP POLICY IF EXISTS fin_require_write_insert ON public.obra_comissao_pagamentos;
CREATE POLICY fin_require_write_insert ON public.obra_comissao_pagamentos
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.fin_can_write_comissao());

DROP POLICY IF EXISTS fin_require_write_update ON public.obra_comissao_pagamentos;
CREATE POLICY fin_require_write_update ON public.obra_comissao_pagamentos
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.fin_can_write_comissao());

DROP POLICY IF EXISTS fin_require_delete ON public.obra_comissao_pagamentos;
CREATE POLICY fin_require_delete ON public.obra_comissao_pagamentos
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.fin_can_delete());
