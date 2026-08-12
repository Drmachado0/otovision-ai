import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const path = "supabase/migrations/20260812160000_fix_payroll_payment_runtime.sql";
const sql = () => existsSync(path) ? readFileSync(path, "utf8") : "";

describe("pagamento de folha compatível com conta textual", () => {
  it("mantém conta como TEXT e valida tenant", () => {
    const migration = sql();
    expect(existsSync(path)).toBe(true);
    expect(migration).toContain("v_conta TEXT");
    expect(migration).toContain("id::TEXT = v_conta");
    expect(migration).toContain("user_id = v_user");
    expect(migration).not.toContain("v_conta UUID");
  });

  it("atualiza transação e folha atomicamente e suporta replay", () => {
    const migration = sql();
    expect(migration).toContain("UPDATE public.obra_transacoes_fluxo");
    expect(migration).toContain("UPDATE public.obra_folhas_pagamento");
    expect(migration).toContain("idempotent_replay");
    expect(migration).toContain("FOR UPDATE");
  });
});
