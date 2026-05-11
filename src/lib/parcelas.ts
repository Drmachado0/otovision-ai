function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseLocalDate(dateISO: string): Date {
  const [year, month, day] = dateISO.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function formatLocalISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function addMonthsClamped(dateISO: string, monthsToAdd: number): string {
  const base = parseLocalDate(dateISO);
  const targetMonthIndex = base.getMonth() + monthsToAdd;
  const targetYear = base.getFullYear() + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const targetDay = Math.min(base.getDate(), lastDayOfMonth(targetYear, normalizedMonth));
  return formatLocalISO(new Date(targetYear, normalizedMonth, targetDay));
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
