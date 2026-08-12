import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const path = "supabase/migrations/20260812100000_ofx_import_integrity.sql";
const sql = () => existsSync(path) ? readFileSync(path, "utf8") : "";

describe("importação OFX idempotente", () => {
  it("persiste identidade bancária única por tenant e conta", () => {
    const migration = sql();
    expect(existsSync(path)).toBe(true);
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS conta_id UUID");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS extrato_fit_id TEXT");
    expect(migration).toContain("uq_obra_movimentacao_bank_fitid");
    expect(migration).toContain("user_id, conta_id, extrato_fit_id");
  });

  it("importa por RPC tenant-safe sem criar lançamento financeiro", () => {
    const migration = sql();
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.import_bank_statement");
    expect(migration).toContain("v_user UUID := auth.uid()");
    expect(migration).toContain("Conta financeira ativa não pertence ao usuário");
    expect(migration).toContain("status_revisao");
    expect(migration).toContain("'pendente'");
    expect(migration).toContain("ON CONFLICT (user_id, conta_id, extrato_fit_id)");
    expect(migration).not.toContain("INSERT INTO public.obra_transacoes_fluxo");
  });

  it("exige FITID, documento do tenant e lote limitado", () => {
    const migration = sql();
    expect(migration).toContain("jsonb_array_length(p_transactions) > 2000");
    expect(migration).toContain("FITID obrigatório");
    expect(migration).toContain("obra_documentos_processados");
    expect(migration).toContain("id = p_document_id");
    expect(migration).toContain("imported_count");
    expect(migration).toContain("duplicate_count");
  });
});
