import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const path = "supabase/migrations/20260812150000_financial_consistency_diagnostics.sql";
const sql = () => existsSync(path) ? readFileSync(path, "utf8") : "";

describe("diagnóstico financeiro tenant-safe", () => {
  it("expõe somente agregados do usuário autenticado", () => {
    const migration = sql();
    expect(existsSync(path)).toBe(true);
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.financial_consistency_report()");
    expect(migration).toContain("v_user UUID := auth.uid()");
    expect(migration).toContain("user_id = v_user");
    expect(migration).toContain("RETURNS JSONB");
    expect(migration).not.toContain("RETURNS TABLE");
  });

  it("mede os invariantes priorizados sem atualizar dados", () => {
    const migration = sql();
    for (const key of [
      "noncanonical_statuses", "transactions_without_account", "legacy_origin_duplicate_groups",
      "installments_without_transaction", "commission_duplicate_groups", "orphan_commissions",
      "ofx_missing_fitid", "reconciliation_value_mismatches", "reconciliation_account_mismatches",
    ]) expect(migration).toContain(`'${key}'`);
    expect(migration).not.toMatch(/UPDATE public\.obra_/);
    expect(migration).not.toMatch(/DELETE FROM public\.obra_/);
  });
});
