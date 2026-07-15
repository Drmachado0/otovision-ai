export const PERCENTUAL_COMISSAO = 8;

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

export interface TransacaoRow {
  data: string;
  valor: number;
}

export type SortField = "data" | "valor";
export type SortDir = "asc" | "desc";
