// Cálculos puros para folha de mão de obra (FGTS / INSS / consolidação mensal)

export interface TrabalhadorEncargo {
  id: string;
  nome: string;
  funcao?: string | null;
  aliquota_fgts?: number | null;
  aliquota_inss?: number | null;
  incide_encargos?: boolean | null;
  valor_diaria?: number | null;
  ativo?: boolean | null;
}

/** Dias úteis padrão por mês para estimativas. */
export const DIAS_UTEIS_MES = 22;

/**
 * Calcula uma folha estimada para o mês com base no valor da diária
 * de cada trabalhador ativo, sem depender de registros de presença.
 * Útil quando não há registros lançados ainda.
 */
export function calcularFolhaEstimada(
  trabalhadores: TrabalhadorEncargo[],
  dias = DIAS_UTEIS_MES,
): FolhaResumo {
  const itens: FolhaItem[] = trabalhadores
    .filter((t) => t.ativo !== false)
    .map((t) => {
      const bruto = (Number(t.valor_diaria) || 0) * dias;
      const incide = !!t.incide_encargos;
      const fgts = incide ? bruto * (Number(t.aliquota_fgts ?? 0) / 100) : 0;
      const inss = incide ? bruto * (Number(t.aliquota_inss ?? 0) / 100) : 0;
      return {
        trabalhador_id: t.id,
        nome: t.nome,
        funcao: t.funcao ?? "",
        dias,
        bruto,
        fgts,
        inss,
        total: bruto + fgts + inss,
        incide_encargos: incide,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const total_diarias = itens.reduce((s, i) => s + i.bruto, 0);
  const total_fgts = itens.reduce((s, i) => s + i.fgts, 0);
  const total_inss = itens.reduce((s, i) => s + i.inss, 0);

  return {
    itens,
    total_diarias,
    total_fgts,
    total_inss,
    total_geral: total_diarias + total_fgts + total_inss,
  };
}

export interface RegistroValor {
  trabalhador_id: string;
  data: string; // YYYY-MM-DD
  valor: number | null;
}

export interface FolhaItemExtras {
  quinzena: number;
  vales: number;
  vale_alimentacao: number;
  encerramento: number;
  ferias_decimo: number;
  horas_extras: number;
}

export interface FolhaItem extends FolhaItemExtras {
  trabalhador_id: string;
  nome: string;
  funcao: string;
  dias: number;
  bruto: number;
  fgts: number;
  inss: number;
  total: number;
  incide_encargos: boolean;
}

export interface FolhaResumo {
  itens: FolhaItem[];
  total_diarias: number;
  total_fgts: number;
  total_inss: number;
  total_quinzena: number;
  total_vales: number;
  total_vale_alim: number;
  total_encerramento: number;
  total_ferias: number;
  total_horas_extras: number;
  total_extras: number;
  total_geral: number;
}

export const EMPTY_EXTRAS: FolhaItemExtras = {
  quinzena: 0,
  vales: 0,
  vale_alimentacao: 0,
  encerramento: 0,
  ferias_decimo: 0,
  horas_extras: 0,
};

function somarExtras(it: FolhaItemExtras): number {
  return (
    (Number(it.quinzena) || 0) +
    (Number(it.vales) || 0) +
    (Number(it.vale_alimentacao) || 0) +
    (Number(it.encerramento) || 0) +
    (Number(it.ferias_decimo) || 0) +
    (Number(it.horas_extras) || 0)
  );
}

export function aplicarExtras(
  resumo: FolhaResumo,
  extrasMap: Record<string, Partial<FolhaItemExtras>>,
): FolhaResumo {
  const itens = resumo.itens.map((i) => {
    const ex = { ...EMPTY_EXTRAS, ...(extrasMap[i.trabalhador_id] ?? {}) };
    const adicional = somarExtras(ex);
    return {
      ...i,
      ...ex,
      total: i.bruto + i.fgts + i.inss + adicional,
    };
  });
  const total_quinzena = itens.reduce((s, i) => s + (Number(i.quinzena) || 0), 0);
  const total_vales = itens.reduce((s, i) => s + (Number(i.vales) || 0), 0);
  const total_vale_alim = itens.reduce((s, i) => s + (Number(i.vale_alimentacao) || 0), 0);
  const total_encerramento = itens.reduce((s, i) => s + (Number(i.encerramento) || 0), 0);
  const total_ferias = itens.reduce((s, i) => s + (Number(i.ferias_decimo) || 0), 0);
  const total_horas_extras = itens.reduce((s, i) => s + (Number(i.horas_extras) || 0), 0);
  const total_extras =
    total_quinzena + total_vales + total_vale_alim + total_encerramento + total_ferias + total_horas_extras;
  return {
    ...resumo,
    itens,
    total_quinzena,
    total_vales,
    total_vale_alim,
    total_encerramento,
    total_ferias,
    total_horas_extras,
    total_extras,
    total_geral: resumo.total_diarias + resumo.total_fgts + resumo.total_inss + total_extras,
  };
}

export function mesRefAtual(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function mesRefDe(dataIso: string): string {
  return dataIso.slice(0, 7);
}

export function calcularFolhaMensal(
  trabalhadores: TrabalhadorEncargo[],
  registros: RegistroValor[],
  mesRef: string,
): FolhaResumo {
  const trabMap = new Map(trabalhadores.map((t) => [t.id, t]));
  const acumulador = new Map<string, FolhaItem>();

  for (const r of registros) {
    if (mesRefDe(r.data) !== mesRef) continue;
    const t = trabMap.get(r.trabalhador_id);
    if (!t) continue;
    const valor = Number(r.valor) || 0;
    const incide = !!t.incide_encargos;
    const fgtsPct = Number(t.aliquota_fgts ?? 0) / 100;
    const inssPct = Number(t.aliquota_inss ?? 0) / 100;

    const cur =
      acumulador.get(t.id) ??
      ({
        trabalhador_id: t.id,
        nome: t.nome,
        funcao: t.funcao ?? "",
        dias: 0,
        bruto: 0,
        fgts: 0,
        inss: 0,
        total: 0,
        incide_encargos: incide,
      } as FolhaItem);

    cur.dias += 1;
    cur.bruto += valor;
    if (incide) {
      cur.fgts += valor * fgtsPct;
      cur.inss += valor * inssPct;
    }
    cur.total = cur.bruto + cur.fgts + cur.inss;
    acumulador.set(t.id, cur);
  }

  const itens = Array.from(acumulador.values()).sort((a, b) =>
    a.nome.localeCompare(b.nome),
  );

  const total_diarias = itens.reduce((s, i) => s + i.bruto, 0);
  const total_fgts = itens.reduce((s, i) => s + i.fgts, 0);
  const total_inss = itens.reduce((s, i) => s + i.inss, 0);

  return {
    itens,
    total_diarias,
    total_fgts,
    total_inss,
    total_geral: total_diarias + total_fgts + total_inss,
  };
}

export interface MesAgg {
  mes: string; // YYYY-MM
  label: string; // mai/26
  diarias: number;
  fgts: number;
  inss: number;
  total: number;
}

const MES_LABEL = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

export function ultimosMeses(n: number, ref = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export function labelMes(mesRef: string): string {
  const [y, m] = mesRef.split("-").map(Number);
  return `${MES_LABEL[m - 1]}/${String(y).slice(2)}`;
}

export function agruparPorMes(
  registros: RegistroValor[],
  folhas: { mes_ref: string; total_fgts: number; total_inss: number }[],
  meses: string[],
): MesAgg[] {
  const diariasPorMes = new Map<string, number>();
  for (const r of registros) {
    const mes = mesRefDe(r.data);
    diariasPorMes.set(mes, (diariasPorMes.get(mes) ?? 0) + (Number(r.valor) || 0));
  }
  const folhaMap = new Map(folhas.map((f) => [f.mes_ref, f]));

  return meses.map((mes) => {
    const diarias = diariasPorMes.get(mes) ?? 0;
    const f = folhaMap.get(mes);
    const fgts = Number(f?.total_fgts ?? 0);
    const inss = Number(f?.total_inss ?? 0);
    return {
      mes,
      label: labelMes(mes),
      diarias,
      fgts,
      inss,
      total: diarias + fgts + inss,
    };
  });
}
