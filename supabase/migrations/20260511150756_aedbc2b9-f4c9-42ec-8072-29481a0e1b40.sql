
-- Fix documentos bucket: tighten INSERT, DELETE; add UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own documents" ON storage.objects;

CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Restrict realtime.messages so authenticated users can only subscribe to their own topics
-- Topic convention: "<table>:user_id=<uuid>" or contains the user's uid; we restrict by owner via topic prefix matching auth.uid()
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can receive own topic broadcasts" ON realtime.messages;
CREATE POLICY "Authenticated can receive own topic broadcasts"
ON realtime.messages FOR SELECT TO authenticated
USING (
  -- Only allow if the topic embeds the caller's uid
  topic LIKE '%' || auth.uid()::text || '%'
);

DROP POLICY IF EXISTS "Authenticated can send to own topics" ON realtime.messages;
CREATE POLICY "Authenticated can send to own topics"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  topic LIKE '%' || auth.uid()::text || '%'
);
