import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  buildAssistantPurchase,
  buildAssistantTransaction,
  normalizeIdempotencyKey,
  validateAssistantLaunch,
  type AssistantLaunchInput,
} from "../_shared/assistant-policy.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED_ORIGINS = new Set(
  (Deno.env.get("ALLOWED_ORIGINS") || "https://otovisionocontrole.lovable.app")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  return {
    ...(origin && ALLOWED_ORIGINS.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key, x-assistant-action",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

function originAllowed(req: Request): boolean {
  const origin = req.headers.get("Origin");
  return !origin || ALLOWED_ORIGINS.has(origin);
}

const READ_RESOURCES: Record<string, { table: string; select: string; order?: string }> = {
  config: { table: "obra_config", select: "id,nome_obra,orcamento_total,area_construida,data_inicio,data_termino,responsavel" },
  contas: { table: "obra_contas_financeiras", select: "id,nome,tipo,ativa,saldo_inicial,observacoes", order: "nome" },
  categorias: { table: "obra_categorias", select: "id,nome", order: "nome" },
  fornecedores: { table: "obra_fornecedores", select: "id,nome,cnpj,especialidade,status,avaliacao,observacoes", order: "nome" },
  transacoes: { table: "obra_transacoes_fluxo", select: "id,tipo,valor,data,data_vencimento,data_pagamento,categoria,descricao,forma_pagamento,conta_id,status,referencia,origem_tipo,origem_id,created_at", order: "created_at" },
  compras: { table: "obra_compras", select: "id,fornecedor,fornecedor_id,descricao,categoria,valor_total,data,forma_pagamento,numero_parcelas,parcelas,status_entrega,conta_id,nf_vinculada,created_at", order: "created_at" },
  documentos: { table: "obra_documentos_processados", select: "id,nome_arquivo,tipo_documento,status_processamento,confianca_extracao,duplicidade_status,duplicidade_score,motivo_revisao,hash_arquivo,created_at", order: "created_at" },
  auditoria: { table: "obra_audit_log", select: "id,acao,tabela,registro_id,dados_novos,created_at", order: "created_at" },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function withCors(req: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(corsHeadersFor(req))) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

const MAX_BODY_BYTES = 256 * 1024;

class BodyTooLargeError extends Error {}

async function readJsonLimited(req: Request): Promise<unknown> {
  if (!req.body) return {};
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new BodyTooLargeError("body limit exceeded");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  if (!received) return {};
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const encoded = btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  return `ova_${encoded}`;
}

function bearer(req: Request): string {
  return (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

async function authenticatedAdmin(req: Request) {
  const token = bearer(req);
  if (!token) return null;
  const client = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: userData, error } = await client.auth.getUser();
  if (error || !userData.user) return null;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: roles, error: roleError } = await admin.from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .limit(1);
  if (roleError || !roles?.length) return null;
  return userData.user;
}

async function delegatedAccess(req: Request, requiredScope: "read" | "launch") {
  const token = bearer(req);
  if (!token.startsWith("ova_")) return null;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const hash = await sha256(token);
  const { data, error } = await admin
    .from("obra_assistant_delegations")
    .select("id,user_id,scopes,default_account_id,enabled,expires_at")
    .eq("token_hash", hash)
    .eq("enabled", true)
    .maybeSingle();
  if (error || !data) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) return null;
  if (!Array.isArray(data.scopes) || !data.scopes.includes(requiredScope)) return null;
  return data;
}

async function recordSecurityEvent(
  delegation: { id: string; user_id: string },
  event: { reason: string; idempotencyKey?: string; documentHash?: string },
) {
  const safeKey = /^[a-z0-9:_./-]{8,200}$/.test(event.idempotencyKey || "") ? event.idempotencyKey : null;
  const safeHash = /^[a-f0-9]{64}$/.test(event.documentHash || "") ? event.documentHash : null;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { error } = await admin.from("obra_assistant_security_events").insert({
    delegation_id: delegation.id,
    user_id: delegation.user_id,
    reason: event.reason,
    idempotency_key: safeKey,
    document_hash: safeHash,
  });
  if (error) console.error("assistant security event write failed", error.code);
}

async function activate(req: Request) {
  const user = await authenticatedAdmin(req);
  if (!user) return json({ error: "Apenas o administrador autenticado pode ativar o assistente" }, 403);
  const body = await readJsonLimited(req).catch((error) => {
    if (error instanceof BodyTooLargeError) throw error;
    return {};
  }) as Record<string, unknown>;
  const defaultAccountId = String(body.default_account_id || "");
  if (!defaultAccountId) return json({ error: "default_account_id é obrigatório" }, 400);
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: account, error: accountError } = await admin
    .from("obra_contas_financeiras")
    .select("id,nome,ativa")
    .eq("id", defaultAccountId)
    .eq("user_id", user.id)
    .eq("ativa", true)
    .maybeSingle();
  if (accountError) return json({ error: "Não foi possível validar a conta padrão" }, 500);
  if (!account) return json({ error: "Conta padrão ativa não encontrada" }, 400);

  const token = randomToken();
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + 180 * 86400000).toISOString();
  const { error } = await admin.rpc("rotate_assistant_delegation", {
    p_user_id: user.id,
    p_label: String(body.label || "Hermes Telegram").slice(0, 100),
    p_token_hash: tokenHash,
    p_token_prefix: token.slice(0, 12),
    p_default_account_id: account.id,
    p_expires_at: expiresAt,
  });
  if (error) return json({ error: "Não foi possível ativar a delegação" }, 500);
  return json({ token, token_exibido_uma_vez: true, expires_at: expiresAt, default_account: account.nome }, 201);
}

async function revoke(req: Request) {
  const user = await authenticatedAdmin(req);
  if (!user) return json({ error: "Apenas o administrador autenticado pode revogar o assistente" }, 403);
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: revokedCount, error } = await admin.rpc("revoke_assistant_delegation", {
    p_user_id: user.id,
  });
  if (error) return json({ error: "Não foi possível revogar a delegação" }, 500);
  return json({ success: true, revoked_count: revokedCount || 0 });
}

async function status(req: Request) {
  const user = await authenticatedAdmin(req);
  if (!user) return json({ error: "Apenas o administrador autenticado pode consultar o acesso" }, 403);
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data, error } = await admin.from("obra_assistant_delegations")
    .select("id,label,token_prefix,scopes,default_account_id,enabled,expires_at,last_used_at")
    .eq("user_id", user.id)
    .eq("enabled", true)
    .maybeSingle();
  if (error) return json({ error: "Não foi possível consultar a delegação" }, 500);
  return json({ delegation: data });
}

async function context(req: Request) {
  const delegation = await delegatedAccess(req, "read");
  if (!delegation) return json({ error: "Delegação inválida, expirada ou sem escopo de leitura" }, 401);
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const url = new URL(req.url);
  const resource = url.searchParams.get("resource") || "resumo";
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 100, 1), 500);
  if (resource !== "resumo" && !READ_RESOURCES[resource]) {
    return json({ error: "Recurso não permitido", resources: Object.keys(READ_RESOURCES) }, 400);
  }
  const { data, error } = await admin.rpc("read_assistant_context", {
    p_delegation_id: delegation.id,
    p_user_id: delegation.user_id,
    p_resource: resource,
    p_limit: limit,
  });
  if (error) return json({ error: "Falha ao consultar recurso" }, 500);
  return json(data);
}

async function launch(req: Request) {
  const delegation = await delegatedAccess(req, "launch");
  if (!delegation) return json({ error: "Delegação inválida, expirada ou sem escopo de lançamento" }, 401);
  const input = await readJsonLimited(req).catch((error) => {
    if (error instanceof BodyTooLargeError) throw error;
    return null;
  }) as AssistantLaunchInput | null;
  if (!input) return json({ error: "JSON inválido" }, 400);
  input.conta_id = input.conta_id || delegation.default_account_id;
  const errors = validateAssistantLaunch(input);
  if (errors.length) {
    await recordSecurityEvent(delegation, {
      reason: "validation_rejected",
      idempotencyKey: input.idempotency_key,
      documentHash: String(input.documento_hash || "").toLowerCase(),
    });
    return json({ error: "Documento exige revisão", review_required: true, reasons: errors }, 422);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const account = await admin.from("obra_contas_financeiras").select("id").eq("id", input.conta_id).eq("user_id", delegation.user_id).eq("ativa", true).maybeSingle();
  if (account.error) return json({ error: "Falha ao validar conta financeira" }, 500);
  if (!account.data) {
    await recordSecurityEvent(delegation, { reason: "account_rejected", idempotencyKey: input.idempotency_key, documentHash: input.documento_hash.toLowerCase() });
    return json({ error: "Conta financeira não pertence ao usuário ou está inativa" }, 422);
  }
  const category = await admin.from("obra_categorias").select("id").eq("user_id", delegation.user_id).is("deleted_at", null).eq("nome", input.categoria.trim()).limit(1);
  if (category.error) return json({ error: "Falha ao validar categoria" }, 500);
  if (!category.data?.length) {
    await recordSecurityEvent(delegation, { reason: "category_rejected", idempotencyKey: input.idempotency_key, documentHash: input.documento_hash.toLowerCase() });
    return json({ error: "Categoria não cadastrada", review_required: true, category: input.categoria }, 422);
  }

  const key = normalizeIdempotencyKey(input.idempotency_key || req.headers.get("Idempotency-Key") || "");
  const isPurchase = input.tipo_documento === "nota_fiscal" && input.quitado !== true;
  const table = isPurchase ? "obra_compras" : "obra_transacoes_fluxo";
  const row = isPurchase
    ? buildAssistantPurchase(delegation.user_id, input)
    : buildAssistantTransaction(delegation.user_id, input);
  const { data: response, error: launchError } = await admin.rpc("create_assistant_launch", {
    p_delegation_id: delegation.id,
    p_user_id: delegation.user_id,
    p_idempotency_key: key,
    p_document_hash: input.documento_hash.toLowerCase(),
    p_request_payload: input,
    p_result_table: table,
    p_row: row,
  });
  if (launchError) {
    await recordSecurityEvent(delegation, { reason: "launch_failed", idempotencyKey: key, documentHash: input.documento_hash.toLowerCase() });
    return json({ error: "Falha transacional ao gravar lançamento" }, 500);
  }
  if (response?.duplicate || response?.conflict) {
    await recordSecurityEvent(delegation, { reason: "launch_conflict", idempotencyKey: key, documentHash: input.documento_hash.toLowerCase() });
    return json(response, 409);
  }
  return json(response, response?.idempotent_replay ? 200 : 201);
}

Deno.serve(async (req) => {
  if (!originAllowed(req)) return withCors(req, json({ error: "Origin não permitida" }, 403));
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersFor(req) });
  const url = new URL(req.url);
  const action = req.headers.get("x-assistant-action");
  try {
    let response: Response;
    if (req.method === "POST" && (url.pathname.endsWith("/activate") || action === "activate")) response = await activate(req);
    else if (req.method === "POST" && (url.pathname.endsWith("/revoke") || action === "revoke")) response = await revoke(req);
    else if (req.method === "POST" && action === "status") response = await status(req);
    else if (req.method === "GET") response = await context(req);
    else if (req.method === "POST") response = await launch(req);
    else response = json({ error: "Método não permitido" }, 405);
    return withCors(req, response);
  } catch (error) {
    if (error instanceof BodyTooLargeError) return withCors(req, json({ error: "Requisição excede 256 KB" }, 413));
    console.error("assistente-lancamentos error", error);
    return withCors(req, json({ error: "Erro interno" }, 500));
  }
});
