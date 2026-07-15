import { todayLocalISO } from "@/lib/formatters";

export interface Trabalhador {
  id: string;
  user_id: string;
  nome: string;
  funcao: string;
  telefone: string;
  valor_diaria: number;
  valor_hora: number;
  tipo_contrato: string;
  etapa_id: string | null;
  ativo: boolean;
  data_inicio: string;
  data_fim: string | null;
  observacoes: string;
  incide_encargos: boolean;
  aliquota_fgts: number;
  aliquota_inss: number;
  created_at: string;
  deleted_at: string | null;
}

export interface Registro {
  id: string;
  user_id: string;
  trabalhador_id: string;
  data: string;
  horas: number;
  valor: number;
  etapa: string;
  observacoes: string;
  created_at: string;
}

export interface Folha {
  id: string;
  mes_ref: string;
  total_diarias: number;
  total_fgts: number;
  total_inss: number;
  total_quinzena?: number | null;
  total_vales?: number | null;
  total_vale_alim?: number | null;
  total_encerramento?: number | null;
  total_ferias?: number | null;
  total_horas_extras?: number | null;
  total_geral?: number | null;
  status: string;
}

export interface Conta {
  id: string;
  nome: string;
  tipo: string | null;
}

export const EMPTY_FORM = {
  nome: "",
  funcao: "",
  telefone: "",
  valor_diaria: "",
  valor_hora: "",
  tipo_contrato: "Diária",
  data_inicio: todayLocalISO(),
  observacoes: "",
  incide_encargos: false,
  aliquota_fgts: "8",
  aliquota_inss: "20",
};

export const EMPTY_REGISTRO = {
  data: todayLocalISO(),
  horas: "",
  observacoes: "",
};

export type TrabalhadorForm = typeof EMPTY_FORM;
export type RegistroForm = typeof EMPTY_REGISTRO;
