// Roda de hora em hora via pg_cron.
// Para cada usuário:
//   - se hora atual UTC == prefs.hora_utc (ou padrão 3 quando sem prefs) e prefs.ativo
//   - exporta tabelas obra_*, salva no bucket privado e aplica retenção
//   - opcionalmente envia uma cópia para o Google Drive central
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
const DEFAULT_HOUR = 3;
const DEFAULT_RETENTION = 30;
const ROOT_FOLDER = "OTOVISION-Backups";
const DRIVE_GATEWAY = "https://connector-gateway.lovable.dev/google_drive";

async function driveFetch(path: string, init: RequestInit = {}) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const driveKey = Deno.env.get("GOOGLE_DRIVE_API_KEY");
  if (!lovableKey || !driveKey) throw new Error("Drive credentials missing");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${lovableKey}`);
  headers.set("X-Connection-Api-Key", driveKey);
  return fetch(`${DRIVE_GATEWAY}${path}`, { ...init, headers });
}

async function findOrCreateFolder(name: string, parentId: string | null): Promise<string> {
  const q = [
    `name = '${name.replace(/'/g, "\\'")}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
    parentId ? `'${parentId}' in parents` : null,
  ].filter(Boolean).join(" and ");
  const search = await driveFetch(
    `/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`,
  );
  if (!search.ok) throw new Error(`Drive search failed: ${await search.text()}`);
  const sjson = await search.json();
  if (sjson.files?.[0]?.id) return sjson.files[0].id;

  const create = await driveFetch(`/drive/v3/files?fields=id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    }),
  });
  if (!create.ok) throw new Error(`Drive folder create failed: ${await create.text()}`);
  const cjson = await create.json();
  return cjson.id;
}

async function uploadJsonToDrive(folderId: string, fileName: string, payload: unknown) {
  const boundary = "lov_" + crypto.randomUUID().replace(/-/g, "");
  const metadata = { name: fileName, parents: [folderId] };
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${JSON.stringify(payload)}\r\n` +
    `--${boundary}--`;

  const res = await driveFetch(
    `/upload/drive/v3/files?uploadType=multipart&fields=id,name`,
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
  if (!res.ok) throw new Error(`Drive upload failed [${res.status}]: ${await res.text()}`);
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Auth guard: only pg_cron / admins with the service role key may invoke.
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const provided = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!provided || provided !== serviceKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);


  const currentHour = new Date().getUTCHours();
  const today = new Date().toISOString().split("T")[0];

  // Usuários com dados (uma linha por usuário em obra_config)
  const { data: configs } = await supabaseAdmin
    .from("obra_config")
    .select("user_id")
    .not("user_id", "is", null);
  const allUserIds = Array.from(new Set((configs ?? []).map((r: any) => r.user_id)));

  // Preferências
  const { data: prefsRows } = await supabaseAdmin
    .from("obra_backup_preferencias")
    .select("user_id, hora_utc, retencao_dias, enviar_google_drive, ativo");
  const prefsMap = new Map<string, any>();
  (prefsRows ?? []).forEach((p: any) => prefsMap.set(p.user_id, p));

  // Filtra elegíveis para a hora atual
  const eligible = allUserIds.filter((uid) => {
    const p = prefsMap.get(uid);
    if (p) return p.ativo === true && p.hora_utc === currentHour;
    return currentHour === DEFAULT_HOUR; // fallback
  });

  let rootFolderId: string | null = null;
  const results: Record<string, any> = {};

  for (const userId of eligible) {
    const prefs = prefsMap.get(userId) ?? {
      retencao_dias: DEFAULT_RETENTION,
      enviar_google_drive: false,
    };
    try {
      const tables: Record<string, unknown[]> = {};
      let totalRows = 0;
      for (const table of TABLES) {
        const { data, error } = await supabaseAdmin.from(table).select("*").eq("user_id", userId);
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

      // Retenção por usuário
      const retentionDays = Number(prefs.retencao_dias) || DEFAULT_RETENTION;
      const cutoff = Date.now() - retentionDays * 86400000;
      const { data: files } = await supabaseAdmin.storage.from(BUCKET).list(userId, { limit: 1000 });
      const toDelete = (files ?? [])
        .filter((f) => {
          const t = f.created_at ? new Date(f.created_at).getTime() : 0;
          return t > 0 && t < cutoff;
        })
        .map((f) => `${userId}/${f.name}`);
      if (toDelete.length > 0) {
        await supabaseAdmin.storage.from(BUCKET).remove(toDelete);
      }

      const userResult: any = { ok: true, rows: totalRows, removed_old: toDelete.length };

      // Google Drive (best-effort)
      if (prefs.enviar_google_drive === true) {
        try {
          if (!rootFolderId) rootFolderId = await findOrCreateFolder(ROOT_FOLDER, null);
          let userFolderId: string | null = null;
          const { data: cached } = await supabaseAdmin
            .from("obra_backup_drive_folders")
            .select("folder_id")
            .eq("user_id", userId)
            .maybeSingle();
          if (cached?.folder_id) {
            userFolderId = cached.folder_id;
          } else {
            userFolderId = await findOrCreateFolder(userId, rootFolderId);
            await supabaseAdmin
              .from("obra_backup_drive_folders")
              .upsert({ user_id: userId, folder_id: userFolderId });
          }
          const driveRes = await uploadJsonToDrive(userFolderId, `${today}.json`, payload);
          userResult.drive_file_id = driveRes.id;
        } catch (e) {
          userResult.drive_error = e instanceof Error ? e.message : String(e);
        }
      }

      results[userId] = userResult;
    } catch (e) {
      results[userId] = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      hour_utc: currentHour,
      date: today,
      eligible: eligible.length,
      total_users: allUserIds.length,
      results,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
  );
});
