
-- DELETE policy for obra_backup_preferencias
CREATE POLICY "Users can delete own backup prefs"
ON public.obra_backup_preferencias
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Explicit deny-all for social_accounts (anon/authenticated)
CREATE POLICY "Deny all anon/authenticated access on social_accounts"
ON public.social_accounts
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- Explicit deny-all for whatsapp_conversation_state (anon/authenticated)
CREATE POLICY "Deny all anon/authenticated access on whatsapp_conversation_state"
ON public.whatsapp_conversation_state
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);
