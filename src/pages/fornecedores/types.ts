export interface Fornecedor {
  id: string;
  user_id: string;
  nome: string;
  cnpj: string;
  telefone: string;
  email: string;
  endereco: string;
  banco: string;
  agencia: string;
  conta: string;
  pix: string;
  tipo_pix: string;
  avaliacao: number;
  observacoes: string;
  ativo: boolean;
  created_at: string;
  deleted_at: string | null;
}

export interface Transacao {
  id: string;
  tipo: string;
  valor: number;
  data: string;
  descricao: string;
  categoria: string;
  observacoes: string;
}

export const TIPOS_PIX = ["CPF", "CNPJ", "Email", "Telefone", "Aleatória"];

export const EMPTY_FORM = {
  nome: "",
  cnpj: "",
  telefone: "",
  email: "",
  endereco: "",
  banco: "",
  agencia: "",
  conta: "",
  pix: "",
  tipo_pix: "CPF",
  avaliacao: 5,
  observacoes: "",
};

export type FornecedorForm = typeof EMPTY_FORM;
