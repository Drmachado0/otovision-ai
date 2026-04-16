import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_TABLES = [
  "obra_transacoes_fluxo",
  "obra_compras",
  "obra_comissao_pagamentos",
  "obra_notas_fiscais",
  "obra_documentos_processados",
  "obra_cronograma",
  "obra_config",
  "obra_contas_financeiras",
  "obra_fornecedores",
  "obra_funcionarios",
  "obra_diario",
  "obra_medicoes",
  "obra_orcamentos",
  "obra_composicoes",
  "obra_leitor_historico",
  "obra_notificacoes",
  "obra_audit_log",
  "obra_conciliacoes_bancarias",
  "obra_movimentacoes_extraidas",
  "obra_eventos_processamento",
  "obra_eventos_conciliacao",
  "obra_registro_mao_de_obra",
  "obra_sugestoes_conciliacao",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: userData, error: userError } = await supabaseUser.auth.getUser();
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = userData.user.id;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body?.tables || typeof body.tables !== "object") {
    return new Response(
      JSON.stringify({ error: "Invalid backup format. Expected { tables: { ... } }" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const summary: Record<string, number> = {};
  const errors: string[] = [];

  for (const [table, rows] of Object.entries(body.tables)) {
    if (!ALLOWED_TABLES.includes(table)) {
      errors.push(`Tabela "${table}" não permitida, ignorada.`);
      continue;
    }

    if (!Array.isArray(rows) || rows.length === 0) continue;

    // Override user_id on every row to the authenticated user
    const cleaned = (rows as any[]).map((row) => {
      const { created_at, updated_at, ...rest } = row;
      return { ...rest, user_id: userId };
    });

    const { error } = await supabaseAdmin
      .from(table)
      .upsert(cleaned, { onConflict: "id", ignoreDuplicates: false });

    if (error) {
      errors.push(`${table}: ${error.message}`);
    } else {
      summary[table] = cleaned.length;
    }
  }

  return new Response(
    JSON.stringify({ success: true, summary, errors }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    }
  );
});
