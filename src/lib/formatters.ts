export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// BUG-004: datas YYYY-MM-DD precisam ser interpretadas como local,
// nao UTC — senao em fuso UTC-3 mostram 1 dia a menos.
export function parseLocalDate(date: string): Date {
  if (!date) return new Date(NaN);
  const dateOnly = date.length === 10 ? date : date.split("T")[0];
  const [y, m, d] = dateOnly.split("-").map(Number);
  if (!y || !m || !d) return new Date(date);
  return new Date(y, m - 1, d);
}

export function todayLocalISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDate(date: string): string {
  if (!date) return "-";
  try {
    return new Intl.DateTimeFormat("pt-BR").format(parseLocalDate(date));
  } catch {
    return date;
  }
}

export const CATEGORIAS_PADRAO = [
  "Acabamento", "Administrativo", "Alimentação", "Aporte", "Elétrica",
  "Equipamento", "Equipamentos Médicos", "Estrutura", "Hidráulica",
  "Madeiras", "Mão de Obra", "Materiais de Construção", "Mobiliário",
  "Serviço", "TI", "Tijolos", "Transporte", "Outro",
];

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

const MESES_PT: Record<string, string> = {
  "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
  "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
  "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro",
};

export function formatMes(mes: string): string {
  if (!mes) return "-";
  const parts = mes.split("-");
  if (parts.length === 2) {
    const nomeMes = MESES_PT[parts[1]];
    if (nomeMes) return `${nomeMes}/${parts[0]}`;
  }
  return mes;
}
