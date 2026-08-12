import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const path = "supabase/migrations/20260812140000_canonical_origin_and_account_compatibility.sql";
const sql = () => existsSync(path) ? readFileSync(path, "utf8") : "";

describe("compatibilidade de origem canônica e conta", () => {
  it("falha diante de duplicata canônica e preserva origens legadas", () => {
    const migration = sql();
    expect(existsSync(path)).toBe(true);
    expect(migration).toContain("Duplicatas canônicas de origem precisam ser reconciliadas");
    expect(migration).toContain("origem_tipo IN ('compra', 'compra_parcela', 'nf', 'movimentacao_extraida')");
    expect(migration).toContain("uq_obra_transacoes_origem_canonica");
    expect(migration).not.toContain("documento_telegram");
  });

  it("substitui as RPCs com predicado inferível pelo índice", () => {
    const migration = sql();
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.pay_financial_obligation");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.approve_extracted_movement");
    expect(migration).toContain("ON CONFLICT (user_id, origem_tipo, origem_id)");
  });

  it("compara conta textual e UUID sem conversão destrutiva", () => {
    const migration = sql();
    expect(migration).toContain("v_transaction.conta_id::TEXT");
    expect(migration).toContain("v_movement.conta_id::TEXT");
    expect(migration).not.toContain("ALTER COLUMN conta_id TYPE");
  });
});
