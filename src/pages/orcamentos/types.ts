export interface OrcamentoItem {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

export interface Orcamento {
  id: string;
  user_id: string;
  fornecedor: string;
  descricao: string;
  categoria: string;
  valor_total: number;
  data: string;
  validade: string;
  status: string;
  condicoes_pagamento: string;
  observacoes: string;
  itens: OrcamentoItem[];
  aprovado_por: string | null;
  aprovado_em: string | null;
  created_at: string;
}

export type StatusFilter = "Todos" | "Pendente" | "Aprovado" | "Rejeitado";

export const STATUS_COLORS: Record<string, string> = {
  Pendente: "badge-warning",
  Aprovado: "badge-success",
  Rejeitado: "badge-danger",
  Vencido: "badge-muted",
};

export const EMPTY_ITEM: OrcamentoItem = { descricao: "", quantidade: 1, valor_unitario: 0, valor_total: 0 };

export function parseItens(raw: unknown): OrcamentoItem[] {
  if (Array.isArray(raw)) return raw as OrcamentoItem[];
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
}

export function getDisplayStatus(orcamento: Orcamento): string {
  if (orcamento.status === "Pendente" && orcamento.validade) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const validade = new Date(orcamento.validade + "T00:00:00");
    if (validade < hoje) return "Vencido";
  }
  return orcamento.status;
}
