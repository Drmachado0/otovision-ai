import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const path = "supabase/migrations/20260812130000_remote_runtime_compatibility.sql";
const sql = () => existsSync(path) ? readFileSync(path, "utf8") : "";

describe("compatibilidade do runtime remoto", () => {
  it("versiona helpers de autorização ausentes", () => {
    const migration = sql();
    expect(existsSync(path)).toBe(true);
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.fin_can_write()");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.fin_can_write_comissao()");
    expect(migration).toContain("public.user_roles");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.fin_can_write()");
  });

  it("substitui temp table por arrays tipados no cancelamento", () => {
    const migration = sql();
    expect(migration).toContain("v_series_ids UUID[]");
    expect(migration).toContain("v_group_ids TEXT[]");
    expect(migration).toContain("recorrencia_grupo_id = ANY(v_group_ids)");
    expect(migration).not.toContain("pg_temp");
    expect(migration).toContain("current_date::TEXT");
  });
});
