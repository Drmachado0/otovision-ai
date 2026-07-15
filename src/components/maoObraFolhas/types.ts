import { FolhaStatus } from "@/lib/folhaPagamento";

export interface FolhaRow {
  id: string;
  competencia_mes: string;
  titulo: string;
  obra_nome: string;
  data_fechamento: string;
  status: FolhaStatus;
  total_funcionarios: number;
  total_encargos: number;
  total_geral: number;
  diferenca_conferencia: number;
  financeiro_transacao_id: string | null;
  comissao_id: string | null;
  gerar_comissao: boolean;
  origem: string;
  observacoes: string;
}

export const STATUS_COLORS: Record<FolhaStatus, string> = {
  rascunho: "bg-muted text-muted-foreground",
  conferida: "bg-info/15 text-info",
  lancada: "bg-warning/15 text-warning",
  paga: "bg-success/15 text-success",
  cancelada: "bg-destructive/15 text-destructive",
};
