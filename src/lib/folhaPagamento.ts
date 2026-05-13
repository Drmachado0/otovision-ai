// Folha de pagamento mensal consolidada — utilitários puros.
import { z } from "zod";

export type FolhaStatus = "rascunho" | "conferida" | "lancada" | "paga" | "cancelada";

export interface FolhaItem {
  id?: string;
  trabalhador_id?: string | null;
  ref: number;
  nome: string;
  cpf: string;
  funcao: string;
  qtd_diaria: number;
  valor_diaria: number;
  total_diarias: number;
  quinzena: number;
  vales: number;
  alimentacao: number;
  encerramento: number;
  ferias_13: number;
  horas_extras: number;
  total_geral: number;
  observacoes?: string;
}

export type EncargoTipo = "custos_engenharia" | "exames" | "fgts" | "inss" | "outros";

export interface FolhaEncargo {
  id?: string;
  tipo: EncargoTipo | string;
  descricao: string;
  valor: number;
  observacoes?: string;
}

export interface FolhaTotais {
  total_diarias: number;
  total_quinzena: number;
  total_vales: number;
  total_alimentacao: number;
  total_encerramento: number;
  total_ferias_13: number;
  total_horas_extras: number;
  total_funcionarios: number;
  total_encargos: number;
  total_geral: number;
}

const MESES_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function competenciaLabel(comp: string): string {
  const [y, m] = comp.split("-").map(Number);
  if (!y || !m) return comp;
  return `${MESES_PT[m - 1]}/${y}`;
}

export function referenciaFolha(comp: string): string {
  return `FOLHA-${comp}`;
}

export function normalizarCpf(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

export function calcularTotaisItem(it: Partial<FolhaItem>): FolhaItem {
  const qtd = Number(it.qtd_diaria) || 0;
  const vd = Number(it.valor_diaria) || 0;
  const total_diarias = +(qtd * vd).toFixed(2);
  const total_geral = +(
    total_diarias +
    (Number(it.quinzena) || 0) +
    (Number(it.vales) || 0) +
    (Number(it.alimentacao) || 0) +
    (Number(it.encerramento) || 0) +
    (Number(it.ferias_13) || 0) +
    (Number(it.horas_extras) || 0)
  ).toFixed(2);
  return {
    id: it.id,
    trabalhador_id: it.trabalhador_id ?? null,
    ref: Number(it.ref) || 0,
    nome: it.nome ?? "",
    cpf: it.cpf ?? "",
    funcao: it.funcao ?? "",
    qtd_diaria: qtd,
    valor_diaria: vd,
    total_diarias,
    quinzena: Number(it.quinzena) || 0,
    vales: Number(it.vales) || 0,
    alimentacao: Number(it.alimentacao) || 0,
    encerramento: Number(it.encerramento) || 0,
    ferias_13: Number(it.ferias_13) || 0,
    horas_extras: Number(it.horas_extras) || 0,
    total_geral,
    observacoes: it.observacoes ?? "",
  };
}

export function calcularTotaisFolha(itens: FolhaItem[], encargos: FolhaEncargo[]): FolhaTotais {
  const t: FolhaTotais = {
    total_diarias: 0, total_quinzena: 0, total_vales: 0, total_alimentacao: 0,
    total_encerramento: 0, total_ferias_13: 0, total_horas_extras: 0,
    total_funcionarios: 0, total_encargos: 0, total_geral: 0,
  };
  for (const i of itens) {
    const c = calcularTotaisItem(i);
    t.total_diarias += c.total_diarias;
    t.total_quinzena += c.quinzena;
    t.total_vales += c.vales;
    t.total_alimentacao += c.alimentacao;
    t.total_encerramento += c.encerramento;
    t.total_ferias_13 += c.ferias_13;
    t.total_horas_extras += c.horas_extras;
    t.total_funcionarios += c.total_geral;
  }
  t.total_encargos = encargos.reduce((s, e) => s + (Number(e.valor) || 0), 0);
  t.total_geral = +(t.total_funcionarios + t.total_encargos).toFixed(2);
  // arredondar campos
  for (const k of Object.keys(t) as (keyof FolhaTotais)[]) t[k] = +t[k].toFixed(2);
  return t;
}

export interface ValidacaoFolha {
  erros: string[];
  alertas: string[];
  diferenca: number;
  total_calculado: number;
}

export function validarFolha(
  itens: FolhaItem[],
  encargos: FolhaEncargo[],
  totalInformado?: number,
): ValidacaoFolha {
  const erros: string[] = [];
  const alertas: string[] = [];
  const totais = calcularTotaisFolha(itens, encargos);

  if (itens.length === 0) erros.push("Folha sem funcionários");

  // duplicatas por CPF
  const cpfMap = new Map<string, number>();
  const nomeMap = new Map<string, number>();
  for (const i of itens) {
    if (!i.nome?.trim()) erros.push(`REF ${i.ref}: nome obrigatório`);
    if (i.qtd_diaria < 0 || i.valor_diaria < 0 || i.total_geral < 0) {
      erros.push(`${i.nome || "REF " + i.ref}: valores negativos`);
    }
    const cpf = normalizarCpf(i.cpf);
    if (cpf) cpfMap.set(cpf, (cpfMap.get(cpf) ?? 0) + 1);
    const nome = (i.nome ?? "").trim().toLowerCase();
    if (nome) nomeMap.set(nome, (nomeMap.get(nome) ?? 0) + 1);
  }
  for (const [cpf, n] of cpfMap) if (n > 1) alertas.push(`CPF duplicado (${cpf}): ${n} ocorrências`);
  for (const [nome, n] of nomeMap) if (n > 1) alertas.push(`Nome duplicado (${nome}): ${n} ocorrências`);

  for (const e of encargos) {
    if (Number(e.valor) < 0) erros.push(`Encargo ${e.descricao || e.tipo}: valor negativo`);
  }

  const diferenca = totalInformado != null
    ? +(totalInformado - totais.total_geral).toFixed(2)
    : 0;
  if (totalInformado != null && Math.abs(diferenca) > 0.5) {
    alertas.push(`Diferença de R$ ${diferenca.toFixed(2)} entre total informado e calculado`);
  }

  return { erros, alertas, diferenca, total_calculado: totais.total_geral };
}

// ===== Importação JSON (Hermes) =====

const ItemJsonSchema = z.object({
  ref: z.coerce.number().default(0),
  nome: z.string().min(1),
  cpf: z.string().default(""),
  funcao: z.string().default(""),
  qtd_diaria: z.coerce.number().default(0),
  valor_diaria: z.coerce.number().default(0),
  total_diarias: z.coerce.number().optional(),
  quinzena: z.coerce.number().default(0),
  vales: z.coerce.number().default(0),
  alimentacao: z.coerce.number().default(0),
  encerramento: z.coerce.number().default(0),
  ferias_13: z.coerce.number().default(0),
  horas_extras: z.coerce.number().default(0),
  total_geral: z.coerce.number().optional(),
  observacoes: z.string().optional(),
});

const EncargoJsonSchema = z.object({
  tipo: z.string(),
  descricao: z.string().default(""),
  valor: z.coerce.number().default(0),
  observacoes: z.string().optional(),
});

const FolhaJsonSchema = z.object({
  competencia: z.string().regex(/^\d{4}-\d{2}$/, "Competência deve ser YYYY-MM"),
  titulo: z.string().optional(),
  obra_nome: z.string().optional(),
  data_fechamento: z.string().optional(),
  observacoes: z.string().optional(),
  funcionarios: z.array(ItemJsonSchema).default([]),
  encargos: z.array(EncargoJsonSchema).default([]),
  totais: z
    .object({
      total_funcionarios: z.coerce.number().optional(),
      total_encargos: z.coerce.number().optional(),
      total_geral: z.coerce.number().optional(),
    })
    .partial()
    .optional(),
});

export type FolhaJsonInput = z.infer<typeof FolhaJsonSchema>;

export interface FolhaParsed {
  competencia: string;
  titulo: string;
  obra_nome: string;
  data_fechamento: string;
  observacoes: string;
  itens: FolhaItem[];
  encargos: FolhaEncargo[];
  total_informado?: number;
}

export function parseFolhaJson(input: unknown): FolhaParsed {
  const data = FolhaJsonSchema.parse(input);
  const itens = data.funcionarios.map((f, idx) =>
    calcularTotaisItem({
      ref: f.ref || idx + 1,
      nome: f.nome,
      cpf: f.cpf,
      funcao: f.funcao,
      qtd_diaria: f.qtd_diaria,
      valor_diaria: f.valor_diaria,
      quinzena: f.quinzena,
      vales: f.vales,
      alimentacao: f.alimentacao,
      encerramento: f.encerramento,
      ferias_13: f.ferias_13,
      horas_extras: f.horas_extras,
      observacoes: f.observacoes ?? "",
    }),
  );
  const encargos: FolhaEncargo[] = data.encargos.map((e) => ({
    tipo: e.tipo,
    descricao: e.descricao,
    valor: e.valor,
    observacoes: e.observacoes ?? "",
  }));
  const last = data.competencia + "-28";
  return {
    competencia: data.competencia,
    titulo: data.titulo ?? `Folha de pagamento ${competenciaLabel(data.competencia)}`,
    obra_nome: data.obra_nome ?? "",
    data_fechamento: data.data_fechamento ?? last,
    observacoes: data.observacoes ?? "",
    itens,
    encargos,
    total_informado: data.totais?.total_geral,
  };
}
