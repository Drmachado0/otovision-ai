// Helpers de data para valores "YYYY-MM-DD" tratados como data LOCAL.
//
// Motivo: `new Date("2026-01-31")` é interpretado como UTC midnight pelo JS.
// Em fusos negativos (ex.: UTC-3, Brasil) isso volta 1 dia ao formatar de volta
// para data local, e `setMonth` sem clamp faz meses "sumirem" (jan-31 -> mar-03).
// Estas funções evitam ambos os problemas operando sempre em horário local e
// fazendo clamp no último dia do mês de destino.

/** Converte "YYYY-MM-DD" em um Date no fuso local (meia-noite local). */
export function parseLocalDate(dateISO: string): Date {
  const [year, month, day] = dateISO.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

/** Formata um Date como "YYYY-MM-DD" usando os componentes locais. */
export function formatLocalISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Número de dias no mês (monthIndex 0-11). */
export function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Soma `monthsToAdd` meses a uma data "YYYY-MM-DD", fazendo clamp no último dia
 * do mês de destino (jan-31 + 1 mês -> fev-28/29, não mar-03). Retorna
 * "YYYY-MM-DD".
 */
export function addMonthsClamped(dateISO: string, monthsToAdd: number): string {
  const base = parseLocalDate(dateISO);
  const targetMonthIndex = base.getMonth() + monthsToAdd;
  const targetYear = base.getFullYear() + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const targetDay = Math.min(base.getDate(), lastDayOfMonth(targetYear, normalizedMonth));
  return formatLocalISO(new Date(targetYear, normalizedMonth, targetDay));
}

/**
 * Soma um intervalo de recorrência ("Mensal" | "Trimestral" | "Anual") a uma
 * data "YYYY-MM-DD", com clamp de fim de mês. Frequência desconhecida assume
 * Mensal. Retorna "YYYY-MM-DD".
 */
export function addIntervalClamped(dateISO: string, freq: string): string {
  switch (freq) {
    case "Trimestral":
      return addMonthsClamped(dateISO, 3);
    case "Anual":
      return addMonthsClamped(dateISO, 12);
    case "Mensal":
    default:
      return addMonthsClamped(dateISO, 1);
  }
}
