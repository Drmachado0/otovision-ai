-- 1) llm_phase_config: restrict SELECT to admins only
DROP POLICY IF EXISTS "Authenticated can read llm_phase_config" ON public.llm_phase_config;
CREATE POLICY "Admins can read llm_phase_config"
  ON public.llm_phase_config FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) obra_transacao_anexos: tighten INSERT to require referenced transaction belongs to caller
DROP POLICY IF EXISTS "Users manage own transaction attachments" ON public.obra_transacao_anexos;

CREATE POLICY "Users select own transaction attachments"
  ON public.obra_transacao_anexos FOR SELECT
  TO authenticated
  USING (uploaded_by = auth.uid());

CREATE POLICY "Users insert own transaction attachments"
  ON public.obra_transacao_anexos FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.obra_transacoes_fluxo t
      WHERE t.id = obra_transacao_anexos.transaction_id
        AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users update own transaction attachments"
  ON public.obra_transacao_anexos FOR UPDATE
  TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.obra_transacoes_fluxo t
      WHERE t.id = obra_transacao_anexos.transaction_id
        AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users delete own transaction attachments"
  ON public.obra_transacao_anexos FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

-- 3) social_accounts: revoke direct client access to access_token column
REVOKE SELECT (access_token) ON public.social_accounts FROM anon, authenticated;
