-- Bucket privado para backups automáticos diários
INSERT INTO storage.buckets (id, name, public)
VALUES ('backups-automaticos', 'backups-automaticos', false)
ON CONFLICT (id) DO NOTHING;

-- Cada usuário só vê/baixa os próprios arquivos (pasta = user_id)
CREATE POLICY "Users read own automatic backups"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'backups-automaticos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Habilita extensões necessárias para agendar a edge function
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Agenda execução diária às 03:00 UTC
SELECT cron.schedule(
  'backup-diario-automatico',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ebyruchdswmkuynthiqi.supabase.co/functions/v1/backup-diario-automatico',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVieXJ1Y2hkc3dta3V5bnRoaXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NDQyMzYsImV4cCI6MjA4NjEyMDIzNn0.fKuLCySRNC_YJzO4gNM5Um4WISneTiSyhhhJsW3Ho18"}'::jsonb,
    body := jsonb_build_object('triggered_at', now())
  ) AS request_id;
  $$
);