export type AssistantDocumentType = "boleto" | "recibo" | "nota_fiscal" | "comprovante";

export interface AssistantLaunchInput {
  tipo_documento: AssistantDocumentType;
  descricao: string;
  fornecedor?: string;
  valor: number;
  data_documento: string;
  data_vencimento?: string;
  data_pagamento?: string;
  categoria: string;
  forma_pagamento: string;
  conta_id: string;
  documento_hash: string;
  idempotency_key: string;
  numero_documento?: string;
  numero_parcelas?: number;
  vencimentos?: string[];
  quitado?: boolean;
  confianca: number;
  ambiguo: boolean;
  observacoes?: string;
  source?: {
    platform?: string;
    chat_id?: string;
    message_id?: string;
    file_name?: string;
  };
}

export interface AssistantPurchaseRow {
  user_id: string;
  fornecedor: string;
  descricao: string;
  categoria: string;
  valor_total: number;
  data: string;
  status_entrega: string;
  forma_pagamento: string;
  numero_parcelas: number;
  parcelas: Array<{ numero: number; valor: number; data_vencimento: string; status: string }>;
  observacoes: string;
  conta_id: string;
  nf_vinculada: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SHA256_HEX = /^[a-f0-9]{64}$/i;
const IDEMPOTENCY_KEY = /^[a-zA-Z0-9:_./-]{8,200}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeIdempotencyKey(value: string): string {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!IDEMPOTENCY_KEY.test(normalized)) {
    throw new Error("idempotency_key inválida");
  }
  return normalized;
}

function validDate(value: string | undefined): boolean {
  if (!value || !ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateAssistantLaunch(input: AssistantLaunchInput): string[] {
  const errors: string[] = [];
  if (!(["boleto", "recibo", "nota_fiscal", "comprovante"] as string[]).includes(input.tipo_documento)) {
    errors.push("tipo_documento inválido");
  }
  if (!Number.isFinite(Number(input.valor)) || Number(input.valor) <= 0) errors.push("valor deve ser maior que zero");
  if (!String(input.descricao ?? "").trim()) errors.push("descricao é obrigatória");
  if (String(input.descricao ?? "").length > 500) errors.push("descricao excede 500 caracteres");
  if (!String(input.categoria ?? "").trim()) errors.push("categoria é obrigatória");
  if (String(input.categoria ?? "").length > 120) errors.push("categoria excede 120 caracteres");
  if (!String(input.forma_pagamento ?? "").trim()) errors.push("forma_pagamento é obrigatória");
  if (String(input.forma_pagamento ?? "").length > 120) errors.push("forma_pagamento excede 120 caracteres");
  if (String(input.fornecedor ?? "").length > 300) errors.push("fornecedor excede 300 caracteres");
  if (String(input.observacoes ?? "").length > 2000) errors.push("observacoes excede 2000 caracteres");
  if (!validDate(input.data_documento)) errors.push("data_documento deve estar em YYYY-MM-DD");
  if (input.tipo_documento === "boleto" && !validDate(input.data_vencimento)) {
    errors.push("data_vencimento é obrigatória para boleto");
  }
  if (input.quitado === true && !validDate(input.data_pagamento)) {
    errors.push("data_pagamento deve estar em YYYY-MM-DD quando quitado");
  }
  if (!UUID.test(String(input.conta_id ?? ""))) errors.push("conta_id deve ser UUID válido");
  if (!SHA256_HEX.test(String(input.documento_hash ?? ""))) errors.push("documento_hash SHA-256 é obrigatório");
  try {
    normalizeIdempotencyKey(input.idempotency_key);
  } catch {
    errors.push("idempotency_key inválida");
  }
  if (!Number.isFinite(input.confianca) || input.confianca < 0 || input.confianca > 100) {
    errors.push("confianca deve ser um número entre 0 e 100");
  } else if (input.confianca < 80) {
    errors.push("confiança mínima para gravação automática é 80");
  }
  if (input.ambiguo !== false) errors.push("documento ambíguo exige revisão");
  if (input.numero_parcelas !== undefined) {
    const count = Number(input.numero_parcelas);
    if (!Number.isInteger(count) || count < 1 || count > 60) errors.push("numero_parcelas deve estar entre 1 e 60");
    if (input.vencimentos && input.vencimentos.length !== count) errors.push("vencimentos deve corresponder ao número de parcelas");
    if (input.vencimentos?.some((date) => !validDate(date))) errors.push("todos os vencimentos devem estar em YYYY-MM-DD");
  }
  return errors;
}

function sourceNote(input: AssistantLaunchInput): string {
  const source = input.source ?? {};
  const parts = ["Lançado automaticamente pelo assistente"];
  if (source.platform) parts.push(`origem=${source.platform}`);
  if (source.message_id) parts.push(`mensagem=${source.message_id}`);
  if (source.file_name) parts.push(`arquivo=${source.file_name}`);
  if (input.observacoes) parts.push(input.observacoes.trim());
  return parts.join(" | ").slice(0, 2000);
}

export function buildAssistantTransaction(userId: string, input: AssistantLaunchInput): Record<string, unknown> {
  // `quitado` só deve ser enviado quando o documento ou um comprovante anexo
  // trouxer prova inequívoca de pagamento. Boleto sem comprovante permanece pendente.
  const paid = input.quitado === true;
  const ledgerDate = input.tipo_documento === "boleto"
    ? (input.data_vencimento || input.data_documento)
    : input.data_documento;
  return {
    user_id: userId,
    tipo: "Saída",
    valor: Math.round(Number(input.valor) * 100) / 100,
    data: ledgerDate,
    data_vencimento: input.data_vencimento || input.data_documento,
    categoria: input.categoria.trim(),
    descricao: input.descricao.trim(),
    forma_pagamento: input.forma_pagamento.trim(),
    observacoes: sourceNote(input),
    recorrencia: "Única",
    referencia: `ASSIST-${input.documento_hash.toLowerCase()}`,
    conta_id: input.conta_id,
    status: paid ? "pago" : "pendente",
    data_pagamento: paid ? (input.data_pagamento || input.data_documento) : null,
    origem_tipo: "assistente_documento",
    origem_id: input.documento_hash.toLowerCase(),
  };
}

function splitCents(total: number, count: number): number[] {
  const totalCents = Math.round(total * 100);
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, index) => (base + (index >= count - remainder ? 1 : 0)) / 100);
}

function addMonthsClamped(date: string, months: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

export function buildAssistantPurchase(userId: string, input: AssistantLaunchInput): AssistantPurchaseRow {
  const count = Math.max(1, Number(input.numero_parcelas) || 1);
  const values = splitCents(Number(input.valor), count);
  const firstDue = input.data_vencimento || input.data_documento;
  const dueDates = input.vencimentos?.length === count
    ? input.vencimentos
    : Array.from({ length: count }, (_, index) => addMonthsClamped(firstDue, index));
  return {
    user_id: userId,
    fornecedor: String(input.fornecedor || "Fornecedor não identificado").trim(),
    descricao: input.descricao.trim(),
    categoria: input.categoria.trim(),
    valor_total: Math.round(Number(input.valor) * 100) / 100,
    data: input.data_documento,
    status_entrega: "Pedido",
    forma_pagamento: input.forma_pagamento.trim(),
    numero_parcelas: count,
    parcelas: values.map((valor, index) => ({
      numero: index + 1,
      valor,
      data_vencimento: dueDates[index],
      status: "Pendente",
    })),
    observacoes: sourceNote(input),
    conta_id: input.conta_id,
    nf_vinculada: String(input.numero_documento || `ASSIST-${input.documento_hash.slice(0, 16)}`).trim(),
  };
}
