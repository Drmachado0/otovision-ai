export interface BackupPrefs {
  hora_utc: number;
  retencao_dias: number;
  enviar_google_drive: boolean;
  ativo: boolean;
}

export const DEFAULT_PREFS: BackupPrefs = {
  hora_utc: 3,
  retencao_dias: 30,
  enviar_google_drive: false,
  ativo: true,
};

export interface UserWithRole {
  id: string;
  email: string;
  role: string;
}

export interface ObraConfig {
  id?: string;
  nome_obra: string;
  endereco: string;
  responsavel: string;
  contato_responsavel: string;
  area_construida: number;
  orcamento_total: number;
  data_inicio: string;
  data_termino: string;
}

export const ROLES = ["admin", "financeiro", "construtor", "visualizador"];

export const defaultObraConfig: ObraConfig = {
  nome_obra: "",
  endereco: "",
  responsavel: "",
  contato_responsavel: "",
  area_construida: 0,
  orcamento_total: 0,
  data_inicio: "",
  data_termino: "",
};
