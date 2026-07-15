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

export const CONFIG_DEFAULT: ConfigRow = { orcamento_total: 0, area_construida: 0, data_inicio: "", data_termino: "", nome_obra: "" };
