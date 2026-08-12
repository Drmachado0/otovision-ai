import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const path = "supabase/migrations/20260812170000_harden_purchase_payment_runtime.sql";
const followUpPath = "supabase/migrations/20260812190000_finalize_existing_canonical_payment.sql";
const sql = () => readFileSync(path, "utf8");
const followUpSql = () => readFileSync(followUpPath, "utf8");

describe("hardening forward-only de pagamentos de compra", () => {
  it("mantém estado financeiro separado da logística", () => {
    expect(existsSync(path)).toBe(true);
    expect(sql()).toContain("ADD COLUMN IF NOT EXISTS status_pagamento TEXT");
    expect(sql()).toContain("status_pagamento = 'pago'");
    expect(sql()).not.toContain("SET status_entrega = 'Entregue'");
    expect(sql()).not.toContain("THEN 'Entregue'");
  });

  it("valida o JSON e exige uma parcela única antes de casts", () => {
    expect(sql()).toContain("jsonb_typeof(v_purchase.parcelas::JSONB) <> 'array'");
    expect(sql()).toContain("v_installment_count <> 1");
    expect(sql()).toContain("item->>'numero' ~ '^[0-9]+$'");
    expect(sql()).toContain("v_installment->>'valor' ~ '^[0-9]+([.][0-9]+)?$'");
  });

  it("não reutiliza silenciosamente uma transação incompatível", () => {
    expect(sql()).toContain("Transação de origem divergente");
    expect(sql()).toContain("v_existing_transaction.valor <> v_value");
    expect(sql()).toContain("FOR UPDATE");
  });

  it("baixa explicitamente uma transação canônica pendente já existente em migration posterior", () => {
    expect(existsSync(followUpPath)).toBe(true);
    expect(followUpSql()).toContain("v_existing_transaction.status");
    expect(followUpSql()).toContain("SET status = 'pago', data_pagamento = p_paid_at");
    expect(followUpSql()).toContain("WHERE id = v_existing_transaction.id");
  });
});
