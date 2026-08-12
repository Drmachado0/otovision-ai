import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260812120000_atomic_extracted_movement_approval.sql";
const hookPath = "src/hooks/useDocumentos.ts";
const migration = () => existsSync(migrationPath) ? readFileSync(migrationPath, "utf8") : "";

describe("aprovação atômica de movimentação extraída", () => {
  it("cria obrigação pendente e vincula a movimentação em uma RPC", () => {
    const sql = migration();
    expect(existsSync(migrationPath)).toBe(true);
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.approve_extracted_movement");
    expect(sql).toContain("FOR UPDATE");
    expect(sql).toContain("INSERT INTO public.obra_transacoes_fluxo");
    expect(sql).toContain("status_revisao = 'aprovado'");
    expect(sql).toContain("transacao_id = v_transaction_id");
  });

  it("é tenant-safe, idempotente e não gera comissão no reconhecimento", () => {
    const sql = migration();
    expect(sql).toContain("v_user UUID := auth.uid()");
    expect(sql).toContain("mov.user_id = v_user");
    expect(sql).toContain("idempotent_replay");
    expect(sql).not.toContain("INSERT INTO public.obra_comissao_pagamentos");
    expect(sql).toContain("'pendente'");
  });

  it("remove o helper legado SELECT + INSERT do consumidor ativo", () => {
    const hook = readFileSync(hookPath, "utf8");
    expect(hook).not.toContain('from "@/lib/comissao"');
    expect(hook).not.toContain("registrarTransacaoComComissao(");
    expect(hook).toContain('rpc("approve_extracted_movement"');
  });
});
