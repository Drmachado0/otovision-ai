import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const path = "supabase/migrations/20260812110000_explicit_bank_reconciliation.sql";
const sql = () => existsSync(path) ? readFileSync(path, "utf8") : "";

describe("conciliação bancária explícita", () => {
  it("trava e valida movimentação e transação do mesmo tenant", () => {
    const migration = sql();
    expect(existsSync(path)).toBe(true);
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.reconcile_bank_movement");
    expect(migration).toContain("v_user UUID := auth.uid()");
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("mov.user_id = v_user");
    expect(migration).toContain("tx.user_id = v_user");
  });

  it("exige conta e valor exatos sem matching aproximado", () => {
    const migration = sql();
    expect(migration).toContain("Movimentação sem conta bancária");
    expect(migration).toContain("Conta da movimentação diverge da conta selecionada");
    expect(migration).toContain("Valor da movimentação diverge da obrigação");
    expect(migration).not.toContain("score_compatibilidade >=");
    expect(migration).not.toContain("abs(v_movement.valor - v_transaction.valor) <=");
  });

  it("usa o pagamento canônico e registra conciliação/auditoria na mesma transação", () => {
    const migration = sql();
    expect(migration).toContain("public.pay_financial_obligation");
    expect(migration).toContain("INSERT INTO public.obra_conciliacoes_bancarias");
    expect(migration).toContain("INSERT INTO public.obra_eventos_conciliacao");
    expect(migration).toContain("extrato_fit_id");
    expect(migration).not.toContain("INSERT INTO public.obra_transacoes_fluxo");
  });

  it("impede replay divergente e dupla conciliação", () => {
    const migration = sql();
    expect(migration).toContain("Movimentação já conciliada com outra transação");
    expect(migration).toContain("ON CONFLICT (movimentacao_extraida_id)");
    expect(migration).toContain("idempotent_replay");
  });
});
