-- 1) Lock down social_accounts: do not expose access_token via RLS SELECT to authenticated users.
DROP POLICY IF EXISTS "Users view own social accounts" ON public.social_accounts;
-- (INSERT/UPDATE/DELETE policies remain so users can manage their connections;
--  reads of token material must go through service-role edge functions.)

-- 2) Explicit deny-all for obra_backup_drive_folders (only service role uses it).
DROP POLICY IF EXISTS "Deny all client access" ON public.obra_backup_drive_folders;
CREATE POLICY "Deny all client access"
ON public.obra_backup_drive_folders
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- 3) Explicit deny-all for n8n_* tables (service-role-only).
DROP POLICY IF EXISTS "Deny all client access" ON public.n8n_eventos_processados;
CREATE POLICY "Deny all client access"
ON public.n8n_eventos_processados
FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny all client access" ON public.n8n_mensagens_enviadas_bot;
CREATE POLICY "Deny all client access"
ON public.n8n_mensagens_enviadas_bot
FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny all client access" ON public.n8n_mensagens_processadas;
CREATE POLICY "Deny all client access"
ON public.n8n_mensagens_processadas
FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

-- 4) Re-schedule the backup cron with an Authorization header carrying the cron secret.
SELECT cron.unschedule('backup-diario-automatico') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'backup-diario-automatico');

SELECT cron.schedule(
  'backup-diario-automatico',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ebyruchdswmkuynthiqi.supabase.co/functions/v1/backup-diario-automatico',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key'),
      'X-Cron-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'backup_cron_secret')
    ),
    body := jsonb_build_object('triggered_at', now())
  ) AS request_id;
  $$
);
