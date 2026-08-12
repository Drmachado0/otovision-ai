import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const path = "supabase/migrations/20260812200000_validate_paid_canonical_payment.sql";
const sql = () => readFileSync(path, "utf8");

describe("validação final de pagamento canônico", () => {
  it("valida vencimento ISO sem escapes regex ambíguos", () => {
    expect(existsSync(path)).toBe(true);
    expect(sql()).toContain("^[0-9]{4}-[0-9]{2}-[0-9]{2}$");
    expect(sql()).not.toContain("\\\\d{4}");
  });

  it("rejeita replay de transação paga com atributos financeiros divergentes", () => {
    expect(sql()).toContain("Transação paga diverge da solicitação");
    expect(sql()).toContain("v_existing_transaction.conta_id IS DISTINCT FROM p_account_id::TEXT");
    expect(sql()).toContain("v_existing_transaction.data_pagamento IS DISTINCT FROM p_paid_at");
    expect(sql()).toContain("COALESCE(v_existing_transaction.metodo_pagamento, v_existing_transaction.forma_pagamento, '')");
    expect(sql()).toContain("v_existing_transaction.comprovante_path IS DISTINCT FROM p_receipt_path");
  });
});
