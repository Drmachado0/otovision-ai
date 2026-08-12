import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260812040000_assistant_delegated_access.sql", "utf8");
const canonicalCategoriesMigration = readFileSync("supabase/migrations/20260812050000_seed_canonical_financial_categories.sql", "utf8");
const cancelRecurrencesMigration = readFileSync("supabase/migrations/20260812060000_cancel_assistant_recurring_payables.sql", "utf8");
const cancelRecurrencesRuntimeFix = readFileSync("supabase/migrations/20260812070000_fix_cancel_recurring_payables_runtime.sql", "utf8");
const edge = readFileSync("supabase/functions/assistente-lancamentos/index.ts", "utf8");

describe("contrato transacional do assistente", () => {
  it("centraliza reserva, lançamento, conclusão e contexto do trigger de auditoria em uma RPC", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.create_assistant_launch");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toMatch(/INSERT INTO public\.obra_assistant_operations[\s\S]*set_config\('request\.jwt\.claims'/);
    expect(edge).toContain('.rpc("create_assistant_launch"');
    expect(edge).not.toContain('admin.from(table).insert(row)');
  });

  it("impõe no banco que conta, delegação e operação pertençam ao mesmo usuário", () => {
    expect(migration).toContain("validate_assistant_delegation_account");
    expect(migration).toContain("validate_assistant_operation_tenant");
    expect(migration).not.toContain("ALTER TABLE public.obra_contas_financeiras");
  });

  it("materializa as categorias canônicas da interface sem duplicar registros", () => {
    expect(canonicalCategoriesMigration).toContain("Material");
    expect(canonicalCategoriesMigration).toContain("Mão de Obra");
    expect(canonicalCategoriesMigration).toContain("Administrativo");
    expect(canonicalCategoriesMigration).toContain("ON CONFLICT DO NOTHING");
    expect(canonicalCategoriesMigration).toMatch(/INSERT INTO public\.obra_categorias[\s\S]*FROM public\.obra_assistant_delegations/);
    expect(edge).toContain("Categoria não cadastrada");
  });

  it("cancela recorrências de forma tenant-safe sem tocar em pagos", () => {
    expect(cancelRecurrencesMigration).toContain("CREATE OR REPLACE FUNCTION public.cancel_assistant_recurring_payables");
    expect(cancelRecurrencesMigration).toContain("recorrencia_mae = true");
    expect(cancelRecurrencesMigration).toContain("recorrencia_ativa = false");
    expect(cancelRecurrencesMigration).toContain("status = 'pendente'");
    expect(cancelRecurrencesMigration).toContain("deleted_at = now()");
    expect(cancelRecurrencesMigration).toContain("p_confirm IS DISTINCT FROM 'CANCELAR_TODAS_RECORRENCIAS'");
    expect(cancelRecurrencesMigration).toContain("GRANT EXECUTE ON FUNCTION public.cancel_assistant_recurring_payables");
    expect(edge).toContain('action === "cancel-recurrences"');
    expect(edge).toContain('.rpc("cancel_assistant_recurring_payables"');
    expect(cancelRecurrencesRuntimeFix).toContain("mother.recorrencia_grupo_id = occurrence.recorrencia_grupo_id");
    expect(cancelRecurrencesRuntimeFix).not.toContain("recorrencia_grupo_id = ANY");
    expect(cancelRecurrencesRuntimeFix).not.toContain("v_groups UUID[]");
  });

  it("propaga falhas de rotação e revogação em vez de confirmar falsamente", () => {
    expect(edge).toContain('.rpc("rotate_assistant_delegation"');
    expect(edge).toContain('.rpc("revoke_assistant_delegation"');
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.revoke_assistant_delegation");
  });

  it("revalida e serializa leituras com revogação no banco", () => {
    expect(edge).toContain('.rpc("read_assistant_context"');
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.read_assistant_context");
    expect(migration).toMatch(/read_assistant_context[\s\S]*pg_advisory_xact_lock[\s\S]*scopes @> ARRAY\['read'\]/);
  });

  it("mantém invariantes financeiras e uma única auditoria no PostgreSQL", () => {
    expect(migration).toContain("Valor do lançamento deve ser positivo");
    expect(migration).toContain("Parcelas inválidas");
    expect(migration).toContain("set_config('request.jwt.claims'");
    const launchBody = migration.split("CREATE OR REPLACE FUNCTION public.create_assistant_launch")[1];
    expect(launchBody).not.toContain("INSERT INTO public.obra_audit_log");
  });

  it("só permite replay quando chave, documento e pedido são semanticamente idênticos", () => {
    expect(migration).toContain("Chave de idempotência reutilizada para outro pedido");
    expect(migration).toMatch(/v_operation\.document_hash IS DISTINCT FROM p_document_hash/);
    expect(migration).toMatch(/v_operation\.request_payload IS DISTINCT FROM p_request_payload/);
  });

  it("vincula o payload documental aos campos financeiros efetivamente gravados", () => {
    expect(migration).toContain("Linha financeira diverge do documento validado");
    expect(migration).toMatch(/p_row->>'valor_total'[\s\S]*p_request_payload->>'valor'/);
    expect(migration).toMatch(/p_row->>'valor'[\s\S]*p_request_payload->>'valor'/);
    expect(migration).toMatch(/p_row->>'status' = 'pago'[\s\S]*p_request_payload->>'quitado'/);
    expect(migration).toMatch(/p_row->>'origem_id' IS DISTINCT FROM p_document_hash/);
    expect(migration).toMatch(/p_row->>'data' IS DISTINCT FROM \(CASE[\s\S]*END\)/);
    expect(migration).toMatch(/p_row->>'data_vencimento'[\s\S]*p_request_payload->>'data_vencimento'/);
    expect(migration).toMatch(/p_row->>'data_pagamento'[\s\S]*p_request_payload->>'data_pagamento'/);
  });

  it("aplica allowlist de CORS sem refletir origens desconhecidas", () => {
    expect(edge).toContain("ALLOWED_ORIGINS");
    expect(edge).toContain("corsHeadersFor(req)");
    expect(edge).toContain("Origin não permitida");
    expect(edge).not.toContain('split(",")[0]');
  });

  it("limita o corpo pelos bytes realmente lidos e impede cache de respostas sensíveis", () => {
    expect(edge).toContain("async function readJsonLimited");
    expect(edge).toContain("reader.read()");
    expect(edge).toContain("received > MAX_BODY_BYTES");
    expect(edge).not.toContain('req.headers.get("content-length")');
    expect(edge).toContain('"Cache-Control": "no-store"');
  });

  it("registra rejeições sanitizadas depois que a delegação é identificada", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.obra_assistant_security_events");
    expect(migration).toContain("CONSTRAINT obra_assistant_security_events_reason");
    expect(migration).toContain("validate_assistant_security_event_tenant");
    expect(migration).toMatch(/obra_assistant_security_events[\s\S]*d\.id = NEW\.delegation_id AND d\.user_id = NEW\.user_id/);
    expect(edge).toContain("recordSecurityEvent");
    expect(edge).toContain('reason: "validation_rejected"');
    expect(edge).toContain('reason: "launch_conflict"');
    const securityEventBody = edge.split("async function recordSecurityEvent")[1].split("async function activate")[0];
    expect(securityEventBody).not.toContain("request_payload");
    expect(securityEventBody).not.toContain("token");
  });

  it("não expõe mensagens internas de exceção ao cliente", () => {
    expect(edge).toContain('console.error("assistente-lancamentos error", error)');
    expect(edge).toContain('return withCors(req, json({ error: "Erro interno" }, 500))');
    expect(edge).not.toContain('error instanceof Error ? error.message');
  });

  it("verifica o papel admin por existência e trata erro explicitamente", () => {
    expect(edge).toMatch(/from\("user_roles"\)[\s\S]*eq\("role", "admin"\)[\s\S]*limit\(1\)/);
    expect(edge).toMatch(/roleError[\s\S]*return null/);
  });
});
