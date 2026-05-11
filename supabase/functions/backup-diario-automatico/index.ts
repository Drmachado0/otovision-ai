// Edge function executada diariamente via pg_cron.
// Itera todos os usuários com dados, exporta para JSON e salva no bucket privado.
// Mantém retenção de 30 dias.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABLES = [
  "obra_transacoes_fluxo",
  "obra_compras",
  "obra_comissao_pagamentos",
  "obra_notas_fiscais",
  "obra_documentos_processados",
  "obra_config",
  "obra_contas_financeiras",
  "obra_fornecedores",
  "obra_funcionarios",
  "obra_orcamentos",
  "obra_composicoes",
  "obra_leitor_historico",
  "obra_notificacoes",
  "obra_audit_log",
  "obra_eventos_processamento",
  "obra_registro_mao_de_obra",
];

const BUCKET = "backups-automaticos";
const RETENTION_DAYS = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Descobre user_ids únicos a partir de obra_config (uma linha por usuário)
  const { data: configs, error: cfgErr } = await supabaseAdmin
    .from("obra_config")
    .select("user_id")
    .not("user_id", "is", null);

  if (cfgErr) {
    return new Response(JSON.stringify({ error: cfgErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userIds = Array.from(new Set((configs ?? []).map((r: any) => r.user_id)));
  const today = new Date().toISOString().split("T")[0];
  const results: Record<string, any> = {};

  for (const userId of userIds) {
    try {
      const tables: Record<string, unknown[]> = {};
      let totalRows = 0;
      for (const table of TABLES) {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select("*")
          .eq("user_id", userId);
        if (!error && data) {
          tables[table] = data;
          totalRows += data.length;
        }
      }

      if (totalRows === 0) {
        results[userId] = { skipped: "no data" };
        continue;
      }

      const payload = {
        version: "1.0",
        exported_at: new Date().toISOString(),
        user_id: userId,
        automatic: true,
        tables,
      };

      const path = `${userId}/${today}.json`;
      const { error: upErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(path, new Blob([JSON.stringify(payload)], { type: "application/json" }), {
          upsert: true,
          contentType: "application/json",
        });

      if (upErr) {
        results[userId] = { error: upErr.message };
        continue;
      }

      // Retenção: lista arquivos e remove os antigos
      const { data: files } = await supabaseAdmin.storage.from(BUCKET).list(userId, { limit: 1000 });
      const cutoff = Date.now() - RETENTION_DAYS * 86400000;
      const toDelete = (files ?? [])
        .filter((f) => {
          const t = f.created_at ? new Date(f.created_at).getTime() : 0;
          return t > 0 && t < cutoff;
        })
        .map((f) => `${userId}/${f.name}`);
      if (toDelete.length > 0) {
        await supabaseAdmin.storage.from(BUCKET).remove(toDelete);
      }

      results[userId] = { ok: true, rows: totalRows, removed_old: toDelete.length };
    } catch (e) {
      results[userId] = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  return new Response(
    JSON.stringify({ success: true, date: today, users: userIds.length, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
});
