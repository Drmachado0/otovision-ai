import { addMonthsClamped } from "./dateUtils";

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface ParcelaCompra {
  numero: number;
  valor: number;
  data_vencimento: string;
  status: "Pendente" | "Paga" | string;
}

export function gerarParcelasCompra(valorTotal: number, numParcelas: number, dataInicio: string): ParcelaCompra[] {
  if (!Number.isFinite(valorTotal) || valorTotal <= 0) return [];
  if (!Number.isInteger(numParcelas) || numParcelas < 1) return [];

  const valorParcela = roundCurrency(valorTotal / numParcelas);
  return Array.from({ length: numParcelas }, (_, index) => {
    const numero = index + 1;
    const valor = numero === numParcelas
      ? roundCurrency(valorTotal - valorParcela * (numParcelas - 1))
      : valorParcela;

    return {
      numero,
      valor,
      data_vencimento: addMonthsClamped(dataInicio, index),
      status: "Pendente",
    };
  });
}
