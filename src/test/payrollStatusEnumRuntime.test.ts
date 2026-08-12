import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const path = "supabase/migrations/20260812180000_fix_payroll_status_enum_runtime.sql";

describe("compatibilidade enum no pagamento de folha", () => {
  it("converte status para texto antes do coalesce", () => {
    expect(existsSync(path)).toBe(true);
    const sql = readFileSync(path, "utf8");
    expect(sql).toContain("COALESCE(v_folha.status::TEXT, '')");
    expect(sql).not.toContain("COALESCE(v_folha.status, '')");
  });
});
