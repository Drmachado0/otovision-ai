import type { LucideIcon } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

// ── Shared domain types ──

export interface TransacaoRow {
  id: string;
  tipo: string;
  valor: number;
  categoria: string;
  data: string;
  descricao: string;
  forma_pagamento: string;
  observacoes: string;
  origem_tipo?: string | null;
  conciliado?: boolean;
  recorrencia?: string;
  conta_id?: string;
  referencia?: string;
  created_at?: string;
}

export interface EtapaRow {
  id: string;
  nome: string;
  categoria: string;
  responsavel: string;
  inicio_previsto: string;
  fim_previsto: string;
  inicio_real: string | null;
  fim_real: string | null;
  status: string;
  percentual_conclusao: number;
  custo_previsto: number;
  custo_real: number;
  observacoes: string;
  descricao: string;
}

export interface CompraRow {
  id: string;
  fornecedor: string;
  descricao: string;
  categoria: string;
  valor_total: number;
  data: string;
  status_entrega: string;
  forma_pagamento: string;
  numero_parcelas: number;
  observacoes: string;
  nf_vinculada: string;
}

export interface ComissaoRow {
  id: string;
  mes: string;
  valor: number;
  pago: boolean;
  data_pagamento: string;
  observacoes: string;
  auto: boolean;
  categoria: string;
  fornecedor: string;
  forma_pagamento: string;
  transacao_id: string | null;
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  user_email: string;
  acao: string;
  tabela: string;
  registro_id: string;
  created_at: string;
  dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
}

export interface ConfigRow {
  orcamento_total: number;
  area_construida: number;
  data_inicio: string;
  data_termino: string;
  nome_obra: string;
}

export interface ContaRow {
  id: string;
  nome: string;
  tipo: string;
  cor: string;
  saldo_inicial: number;
  ativa: boolean;
}

/** Generic record with string keys — use instead of `any` for JSON payloads */
export type JsonRecord = Record<string, unknown>;

/** Icon component type from lucide-react — use instead of `any` for icon props */
export type IconComponent = LucideIcon;

/** Column definition for CSV export */
export interface CsvColumn {
  key: string;
  label: string;
}

/** Export CSV utility */
export function exportCSV(data: JsonRecord[], filename: string, columns: CsvColumn[]): void {
  const header = columns.map(c => c.label).join(",");
  const rows = data.map(row => columns.map(c => {
    const val = row[c.key];
    const str = val == null ? "" : String(val);
    return str.includes(",") ? `"${str}"` : str;
  }).join(","));
  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Generic date filter for arrays with a date field */
export function filterByDateRange<T>(
  items: T[],
  dateField: string,
  dataInicio: string,
  dataFim: string
): T[] {
  return items.filter(item => {
    const d = (item as Record<string, unknown>)[dateField] as string | undefined;
    if (!d) return true;
    if (dataInicio && d < dataInicio) return false;
    if (dataFim && d > dataFim) return false;
    return true;
  });
}

/** Generic category filter */
export function filterByCategoria<T extends { categoria?: string }>(
  items: T[],
  categoriaFiltro: string
): T[] {
  if (categoriaFiltro === "todas") return items;
  return items.filter(i => i.categoria === categoriaFiltro);
}
