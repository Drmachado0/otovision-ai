import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const path = "supabase/migrations/20260812090000_safe_recurring_shutdown.sql";
const sql = () => existsSync(path) ? readFileSync(path, "utf8") : "";

describe("desativação segura de recorrências", () => {
  it("usa grupos textuais e trava somente séries do tenant", () => {
    const migration = sql();
    expect(existsSync(path)).toBe(true);
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.cancel_assistant_recurring_payables");
    expect(migration).toContain("v_user UUID");
    expect(migration).toContain("recorrencia_grupo_id TEXT");
    expect(migration).toContain("current_date::TEXT");
    expect(migration).toContain("recorrencia_mae IS TRUE");
    expect(migration).toContain("v_user UUID := p_user_id");
    expect(migration).toContain("user_id = v_user");
    expect(migration).toContain("FOR UPDATE");
  });

  it("preserva todo histórico e oculta somente pendentes vinculados", () => {
    const migration = sql();
    expect(migration).toContain("lower(occurrence.status) = 'pendente'");
    expect(migration).toContain("occurrence.deleted_at IS NULL");
    expect(migration).toContain("occurrence.recorrencia_mae IS NOT TRUE");
    expect(migration).toContain("occurrence.recorrencia_grupo_id = series.recorrencia_grupo_id");
    expect(migration).not.toMatch(/DELETE\s+FROM\s+public\.obra_transacoes_fluxo/i);
    expect(migration).not.toMatch(/lower\([^)]*status[^)]*\)\s*=\s*'pago'/i);
  });

  it("retorna read-back e exige confirmação e delegação válidas", () => {
    const migration = sql();
    expect(migration).toContain("CANCELAR_TODAS_RECORRENCIAS");
    expect(migration).toContain("obra_assistant_delegations");
    expect(migration).toContain("series_disabled");
    expect(migration).toContain("pending_occurrences_hidden");
    expect(migration).toContain("remaining_active_series");
    expect(migration).toContain("remaining_pending_occurrences");
  });
});
