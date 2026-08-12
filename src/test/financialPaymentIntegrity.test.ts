import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260812080000_financial_payment_integrity.sql";
const compatibilityPath = "supabase/migrations/20260812140000_canonical_origin_and_account_compatibility.sql";

function migration(): string {
  return existsSync(migrationPath) ? readFileSync(migrationPath, "utf8") : "";
}

function compatibilityMigration(): string {
  return existsSync(compatibilityPath) ? readFileSync(compatibilityPath, "utf8") : "";
}

describe("integridade transacional de pagamentos", () => {
  it("versiona uma RPC única tenant-safe e idempotente", () => {
    const sql = migration();
    expect(existsSync(migrationPath)).toBe(true);
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.pay_financial_obligation");
    expect(sql).toContain("v_user_id UUID := auth.uid()");
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toContain("SET search_path = public");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("FOR UPDATE");
    expect(sql).toContain("p_idempotency_key");
    expect(sql).toContain("Conta financeira ativa não pertence ao usuário");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.pay_financial_obligation");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.pay_financial_obligation");
  });

  it("identifica parcelas por compra e número e atualiza compra e caixa juntos", () => {
    const sql = migration();
    expect(sql).toContain("COMPRA-%s-PARCELA-%s");
    expect(sql).toContain("parcela_numero");
    expect(sql).toContain("jsonb_agg");
    expect(sql).toContain("obra_compras");
    expect(sql).toContain("obra_transacoes_fluxo");
    expect(sql).toContain("status_entrega = CASE");
  });

  it("mantém o fingerprint estável em retries com outro timestamp", () => {
    const sql = migration();
    const fingerprint = sql.slice(sql.indexOf("v_fingerprint :="), sql.indexOf("PERFORM pg_advisory_xact_lock"));
    expect(fingerprint).not.toContain("'paid_at'");
    expect(fingerprint).toContain("'commission'");
    expect(fingerprint).toContain("'account'");
  });

  it("garante uma única comissão ativa por compra ou transação", () => {
    const sql = migration();
    expect(sql).toContain("uq_obra_comissao_active_compra");
    expect(sql).toContain("uq_obra_comissao_active_transacao");
    expect(sql).toContain("IF p_obligation_type IN ('purchase', 'purchase_installment') THEN");
    expect(sql).toContain("ON CONFLICT (user_id, dedup_key) WHERE deleted_at IS NULL AND origem_compra_id IS NOT NULL");
    expect(sql).toContain("ON CONFLICT (user_id, dedup_key) WHERE deleted_at IS NULL AND origem_compra_id IS NULL");
    expect(sql).toContain("ROUND(v_commission_base * 0.08, 2)");
  });

  it("restringe pagamentos a obrigações pendentes e ao tipo correto", () => {
    const sql = migration();
    expect(sql).toContain("Obrigação não está pendente");
    expect(sql).toContain("Compra parcelada deve ser paga por parcela");
    expect(sql).toContain("Parcela não está pendente");
  });

  it("usa data local, comprovante tenant-safe e aplica o predicado canônico forward-only", () => {
    const sql = compatibilityMigration();
    expect(existsSync(compatibilityPath)).toBe(true);
    expect(sql).toContain("p_paid_at AT TIME ZONE 'America/Sao_Paulo'");
    expect(sql).toContain("Comprovante não pertence ao usuário");
    expect(sql).toContain("origem_tipo IN ('compra', 'compra_parcela', 'nf', 'movimentacao_extraida')");
    expect(sql).toContain("btrim(origem_id) <> ''");
  });
});
