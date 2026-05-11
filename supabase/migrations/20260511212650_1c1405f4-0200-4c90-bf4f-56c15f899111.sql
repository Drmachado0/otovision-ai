-- Tabela de preferências de backup por usuário
CREATE TABLE public.obra_backup_preferencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  hora_utc INTEGER NOT NULL DEFAULT 3 CHECK (hora_utc >= 0 AND hora_utc <= 23),
  retencao_dias INTEGER NOT NULL DEFAULT 30 CHECK (retencao_dias >= 1 AND retencao_dias <= 365),
  enviar_google_drive BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.obra_backup_preferencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own backup prefs"
  ON public.obra_backup_preferencias FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own backup prefs"
  ON public.obra_backup_preferencias FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own backup prefs"
  ON public.obra_backup_preferencias FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_backup_prefs_updated
  BEFORE UPDATE ON public.obra_backup_preferencias
  FOR EACH ROW EXECUTE FUNCTION public.obra_handle_updated_at();

-- Cache de pastas no Google Drive (gerenciado apenas pela edge function via service role)
CREATE TABLE public.obra_backup_drive_folders (
  user_id UUID NOT NULL PRIMARY KEY,
  folder_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.obra_backup_drive_folders ENABLE ROW LEVEL SECURITY;
-- Sem políticas: apenas service role acessa.

-- Reagenda o cron para rodar de hora em hora
SELECT cron.unschedule('backup-diario-automatico');
SELECT cron.schedule(
  'backup-diario-automatico',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ebyruchdswmkuynthiqi.supabase.co/functions/v1/backup-diario-automatico',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVieXJ1Y2hkc3dta3V5bnRoaXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NDQyMzYsImV4cCI6MjA4NjEyMDIzNn0.fKuLCySRNC_YJzO4gNM5Um4WISneTiSyhhhJsW3Ho18"}'::jsonb,
    body := jsonb_build_object('triggered_at', now())
  ) AS request_id;
  $$
);