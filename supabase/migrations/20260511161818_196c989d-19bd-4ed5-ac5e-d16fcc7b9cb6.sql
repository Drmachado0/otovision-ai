-- Lock down whatsapp_conversation_state (sensitive patient data) to service_role only
ALTER TABLE IF EXISTS public.whatsapp_conversation_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.whatsapp_conversation_state;
CREATE POLICY "service_role full access"
  ON public.whatsapp_conversation_state
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Add owner-scoped UPDATE/DELETE policies to post-images storage bucket
DROP POLICY IF EXISTS "post-images users update own" ON storage.objects;
CREATE POLICY "post-images users update own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "post-images users delete own" ON storage.objects;
CREATE POLICY "post-images users delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);
