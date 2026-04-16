

# Fix Build Errors + Add Import Backup

## Build Error Fixes

### 1. AppSidebar.tsx — `signOut` not on useAuth
The `useAuth` hook doesn't expose `signOut`. Fix: call `supabase.auth.signOut()` directly instead of destructuring `signOut` from useAuth.

### 2. Compras.tsx — `create_compra_atomica` not in types
The generated types only have `pagar_nf_atomica`. The RPC exists in the DB but not in the type file (which we can't edit). Fix: cast supabase to `any` for this RPC call, e.g. `(supabase as any).rpc("create_compra_atomica", ...)`.

### 3. FluxoCaixa.tsx — nullable fields mismatch
The DB returns `descricao: string | null` but the `Transacao` type expects `string`. Fix: make nullable fields optional in the `Transacao` type (`descricao: string | null`, `forma_pagamento: string | null`).

## New Feature: Import Backup

### Edge Function: `importar-backup`
- New file: `supabase/functions/importar-backup/index.ts`
- Accepts POST with JSON body matching the export format (`{ version, tables: { table_name: rows[] } }`)
- Authenticates user via Authorization header
- For each table in the backup, upserts rows (using the service role client) with the authenticated user's `user_id`
- Uses `upsert` to avoid duplicates (matching on `id`)
- Returns summary of imported rows per table

### UI: Add Import Button in ConfiguracoesPage
- Add file input (hidden) + "Importar Backup (JSON)" button next to the export button
- On file select: read JSON, validate structure, call `supabase.functions.invoke("importar-backup")` with the parsed data
- Show loading state and success/error toast

### Files Changed
1. `src/components/AppSidebar.tsx` — fix signOut
2. `src/pages/FluxoCaixa.tsx` — fix Transacao type nullability
3. `src/pages/Compras.tsx` — cast rpc call
4. `supabase/functions/importar-backup/index.ts` — new edge function
5. `src/pages/ConfiguracoesPage.tsx` — add import button + handler

