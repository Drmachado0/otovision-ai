-- Reagenda o cron 'backup-diario-automatico' lendo o cron secret e a apikey do
-- Supabase Vault em runtime, em vez de mantê-los hardcoded na migration
-- (ver 20260511225819_*.sql, onde X-Cron-Secret e a anon key ficaram em texto
-- puro e foram commitados no repositório).
--
-- ============================================================================
-- AÇÃO MANUAL OBRIGATÓRIA ANTES/DEPOIS DE APLICAR ESTA MIGRATION
-- ============================================================================
-- 1) ROTACIONAR o BACKUP_CRON_SECRET: gere um novo valor aleatório e atualize
--    o secret da edge function:
--       supabase secrets set BACKUP_CRON_SECRET=<novo-valor>
--    (o valor antigo 'd6309b15...' está vazado no histórico git e deve ser
--     considerado comprometido).
--
-- 2) Registrar os segredos no Vault (uma vez) com o VALOR NOVO:
--       select vault.create_secret('<novo-cron-secret>', 'backup_cron_secret');
--       select vault.create_secret('<anon-key>',        'supabase_anon_key');
--    Para atualizar depois:
--       select vault.update_secret(
--         (select id from vault.secrets where name = 'backup_cron_secret'),
--         '<novo-cron-secret>');
--
-- 3) Purgar os secrets do histórico git (git filter-repo / BFG) nos arquivos
--    de migration 20260511211836, 20260511212650 e 20260511225819.
-- ============================================================================

SELECT cron.unschedule('backup-diario-automatico')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'backup-diario-automatico');

SELECT cron.schedule(
  'backup-diario-automatico',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ebyruchdswmkuynthiqi.supabase.co/functions/v1/backup-diario-automatico',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key'),
      'X-Cron-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'backup_cron_secret')
    ),
    body := jsonb_build_object('triggered_at', now())
  ) AS request_id;
  $$
);
