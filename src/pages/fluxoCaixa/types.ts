import { CATEGORIAS_PADRAO, todayLocalISO } from "@/lib/formatters";

export const CATEGORIAS = CATEGORIAS_PADRAO;

export const FORMAS_PAGAMENTO = ["PIX", "Cartão", "Boleto", "Dinheiro", "Transferência"];
export const PAGE_SIZE = 50;

export const makeEmptyForm = () => ({
  tipo: "Saída",
  valor: "",
  data: todayLocalISO(),
  data_vencimento: todayLocalISO(),
  categoria: "Material",
  descricao: "",
  forma_pagamento: "PIX",
  observacoes: "",
  conta_id: "",
  recorrencia_tipo: "Única" as "Única" | "Parcelada" | "Recorrente",
  numero_parcelas: "3",
  periodicidade: "Mensal",
});

export type FluxoForm = ReturnType<typeof makeEmptyForm>;
