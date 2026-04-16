
The user uploaded an error screenshot: "Could not find the 'ativo' column of 'obra_fornecedores' in the schema cache" and the build errors show multiple type mismatches. Let me check the actual DB schema vs code expectations.

Build errors fall into 3 groups:

1. **Tables missing from types.ts** (`obra_mao_de_obra`, `obra_mao_obra_registros`, `obra_fornecedores` partial, view in ConfiguracoesPage line 443) → cast `supabase` to `any` for these queries.

2. **DashboardPage.tsx (lines 93, 121)** — using `as` cast on error result. Need `as unknown as` first.

3. **FornecedoresPage.tsx** — using `tipo_pix` and `ativo` fields that don't exist in DB schema. From the screenshot the column `ativo` doesn't exist in `obra_fornecedores`. Need to either remove these fields from the form/insert payload or add them to the DB.

Checking the runtime error from screenshot: the user IS hitting this in production — fornecedores page tries to insert/select `ativo` column. Best fix: remove `ativo` and `tipo_pix` from the code (since they don't exist in DB schema), OR add them via migration.

Simplest, safest: remove the unsupported fields from `FornecedoresPage.tsx` to match the actual DB schema. For `tipo_pix`, fold it into the `pix` field as a label, or just drop it.

# Plan: Fix Build Errors + Schema Mismatches

## 1. FornecedoresPage.tsx — Remove non-existent columns
- Remove `ativo` field (use `deleted_at IS NULL` for "active" filtering instead)
- Remove `tipo_pix` field from insert/update payload and form (or keep in UI but don't persist)
- Remove `as Fornecedor[]` cast issue by using `as unknown as Fornecedor[]`

## 2. MaoDeObraPage.tsx — Cast supabase to `any`
Tables `obra_mao_de_obra` and `obra_mao_obra_registros` are not in generated types. Wrap all 7 queries (lines 100, 119, 137, 199, 211, 230, 259) with `(supabase as any).from(...)`.

## 3. ConfiguracoesPage.tsx (line 443) — Cast `.from()` to `any`
The table referenced isn't in types — use `(supabase as any).from(...)`.

## 4. DashboardPage.tsx (lines 93, 121) — Fix error-result cast
Change `data as { ... }[]` to `(data as unknown as { ... }[])` so TS accepts the conversion when the query result type union includes `GenericStringError[]`.

## Files Changed
- `src/pages/FornecedoresPage.tsx` — drop `ativo`/`tipo_pix` from payload, fix cast
- `src/pages/MaoDeObraPage.tsx` — cast supabase to `any` on 7 queries
- `src/pages/ConfiguracoesPage.tsx` — cast `.from()` to `any` on line 443
- `src/pages/DashboardPage.tsx` — use `as unknown as` on lines 93 and 121

## Expected Result
- Build passes
- Fornecedores page stops throwing "Could not find 'ativo' column" runtime error
- Mão de Obra page queries execute correctly at runtime (tables exist in DB even if missing from types)
