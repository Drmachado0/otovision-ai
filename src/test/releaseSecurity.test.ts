import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(__dirname, "../..");

function read(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

describe("bloqueadores críticos de segurança", () => {
  it("protege todas as RPCs de folha por papel e restringe EXECUTE", () => {
    const sql = read("supabase/migrations/20260812030000_fix_critical_release_blockers.sql");

    for (const rpc of ["lancar_folha_financeiro", "marcar_folha_paga", "reabrir_folha"]) {
      expect(sql).toContain(`CREATE OR REPLACE FUNCTION public.${rpc}`);
      expect(sql).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${rpc}\\(`));
      expect(sql).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${rpc}\\(`));
    }

    expect(sql.match(/IF NOT public\.fin_can_write\(\)/g)).toHaveLength(2);
    expect(sql.match(/IF NOT public\.fin_can_delete\(\)/g)).toHaveLength(2);
  });

  it("provisiona financeiro automaticamente sem permitir administração global", () => {
    const sql = read("supabase/migrations/20260812030000_fix_critical_release_blockers.sql");

    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.handle_new_user_role()");
    expect(sql).toContain("VALUES (NEW.id, 'financeiro')");
    expect(sql).toContain("AFTER INSERT ON auth.users");
    expect(sql).toContain("ON CONFLICT (user_id, role) DO NOTHING");
    expect(sql).toContain("SELECT u.id, 'financeiro'");
    expect(sql).not.toContain("VALUES (NEW.id, 'admin')");
  });

  it("restaura backup em uma única transação e preserva IDs relacionais", () => {
    const sql = read("supabase/migrations/20260812030000_fix_critical_release_blockers.sql");

    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.restore_user_backup");
    expect(sql).toContain("jsonb_populate_record");
    expect(sql).toContain("row_data - 'user_id'");
    expect(sql).not.toContain("row_data - 'id'");
    expect(sql).toContain("backup id already belongs to another user");
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.restore_user_backup\(jsonb\) FROM PUBLIC/);
  });

  it("Edge Function delega a restauração atômica ao banco sem usar service role", () => {
    const edgeFunction = read("supabase/functions/importar-backup/index.ts");

    expect(edgeFunction).toContain('.rpc("restore_user_backup"');
    expect(edgeFunction).toContain("p_tables: restorableTables");
    expect(edgeFunction).toContain("obra_audit_log: _ignoredAuditLog");
    expect(edgeFunction).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(edgeFunction).not.toContain(".from(table).insert");
  });

  it("não mantém o segredo de cron comprometido no conteúdo alcançável da branch", () => {
    const compromisedMigration = read(
      "supabase/migrations/20260511225819_1a092239-bc2e-4e4c-bcad-fce41d76762c.sql",
    );

    expect(compromisedMigration).not.toMatch(/X-Cron-Secret','[a-f0-9]{64}'/);
    expect(compromisedMigration).toContain("vault.decrypted_secrets");
  });
});
