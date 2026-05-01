import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { formatCurrency, formatMes, todayLocalISO } from "@/lib/formatters";
import {
  Percent, CheckCircle, Clock, DollarSign, TrendingUp, Calendar,
  Trash2, Download, Search, ChevronDown, ChevronRight, AlertTriangle,
  ArrowUp, ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, AreaChart, Area, PieChart, Pie, Cell,
  BarChart,
} from "recharts";
import ComissaoDetailDrawer, { parseObservacoes } from "@/components/ComissaoDetailDrawer";

const PERCENTUAL_COMISSAO = 8;

interface ComissaoRow {
  id: string;
  mes: string;
  valor: number;
  pago: boolean;
  data_pagamento: string;
  observacoes: string;
  auto: boolean;
  categoria: string;
  fornecedor: string;
  forma_pagamento: string;
  transacao_id: string | null;
  created_at: string;
}

interface TransacaoRow {
  data: string;
  valor: number;
}

function OrigemBadgeSmall({ obs }: { obs: string }) {
  const { tipo } = parseObservacoes(obs);
  const cls: Record<string, string> = {
    NF: "badge-info",
    Orçamento: "badge-warning",
    Compra: "badge-primary",
    Manual: "badge-muted",
  };
  return <span className={`${cls[tipo] || cls.Manual} text-[10px]`}>{tipo}</span>;
}

type SortField = "data" | "valor";
type SortDir = "asc" | "desc";

export default function ComissaoPage() {
  const [transacoes, setTransacoes] = useState<TransacaoRow[]>([]);
  const [comissoes, setComissoes] = useState<ComissaoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ComissaoRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Filters
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "pago" | "pendente">("todos");
  const [filtroMes, setFiltroMes] = useState<string>("todos");
  const [filtroOrigem, setFiltroOrigem] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [sortField, setSortField] = useState<SortField>("data");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkPay, setConfirmBulkPay] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Monthly accordion
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const [deleteTarget, setDeleteTarget] = useState<ComissaoRow | null>(null);

  const fetchData = useCallback(async () => {
    const [transRes, comRes] = await Promise.all([
      supabase
        .from("obra_transacoes_fluxo")
        .select("data, valor")
        .eq("tipo", "Saída")
        .is("deleted_at", null),
      supabase.from("obra_comissao_pagamentos")
        .select("id, mes, valor, pago, data_pagamento, observacoes, auto, categoria, fornecedor, forma_pagamento, transacao_id, created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
    ]);

    if (transRes.data) setTransacoes(transRes.data as TransacaoRow[]);
    if (comRes.data) setComissoes(comRes.data as ComissaoRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeSubscription("obra_transacoes_fluxo", fetchData);
  useRealtimeSubscription("obra_comissao_pagamentos", fetchData);

  // ===== AGREGAÇÕES =====
  const agg = useMemo(() => {
    const totalGasto = transacoes.reduce((s, t) => s + Number(t.valor || 0), 0);
    const comissaoPaga = comissoes.filter(c => c.pago).reduce((s, c) => s + Number(c.valor), 0);
    const comissaoPendente = comissoes.filter(c => !c.pago).reduce((s, c) => s + Number(c.valor), 0);
    const comissaoTotal = comissaoPaga + comissaoPendente;
    const comissaoTeorica = totalGasto * (PERCENTUAL_COMISSAO / 100);

    // Gastos por mês (a partir de data)
    const gastosPorMes: Record<string, number> = {};
    for (const t of transacoes) {
      const mes = (t.data || "").slice(0, 7);
      if (!mes) continue;
      gastosPorMes[mes] = (gastosPorMes[mes] || 0) + Number(t.valor || 0);
    }

    // Comissões por mês de referência
    const porMes: Record<string, { pago: number; pendente: number; total: number; count: number; gastosMes: number }> = {};
    for (const c of comissoes) {
      const mes = c.mes || (c.created_at || "").slice(0, 7);
      if (!mes) continue;
      if (!porMes[mes]) porMes[mes] = { pago: 0, pendente: 0, total: 0, count: 0, gastosMes: 0 };
      const v = Number(c.valor);
      if (c.pago) porMes[mes].pago += v;
      else porMes[mes].pendente += v;
      porMes[mes].total += v;
      porMes[mes].count += 1;
    }
    // Inclui meses que só têm gastos (sem comissões ainda)
    for (const mes of Object.keys(gastosPorMes)) {
      if (!porMes[mes]) porMes[mes] = { pago: 0, pendente: 0, total: 0, count: 0, gastosMes: 0 };
      porMes[mes].gastosMes = gastosPorMes[mes];
    }
    // Garante gastosMes para meses já presentes
    for (const mes of Object.keys(porMes)) {
      porMes[mes].gastosMes = gastosPorMes[mes] || 0;
    }

    const mesesOrdenados = Object.keys(porMes).sort();

    // Série para gráficos
    let acumPago = 0;
    let acumTotal = 0;
    const serieMensal = mesesOrdenados.map(m => {
      const d = porMes[m];
      acumPago += d.pago;
      acumTotal += d.total;
      return {
        mes: m,
        mesLabel: formatMes(m),
        pago: d.pago,
        pendente: d.pendente,
        total: d.total,
        teorica: d.gastosMes * (PERCENTUAL_COMISSAO / 100),
        count: d.count,
        acumPago,
        acumTotal,
      };
    });

    // KPIs derivados
    const mesesComComissao = mesesOrdenados.filter(m => porMes[m].total > 0);
    const mediaMensal = mesesComComissao.length
      ? comissaoTotal / mesesComComissao.length
      : 0;
    const mesMaior = [...mesesComComissao].sort((a, b) => porMes[b].total - porMes[a].total)[0];
    const mesMenor = [...mesesComComissao].sort((a, b) => porMes[a].total - porMes[b].total)[0];
    const ticketMedio = comissoes.length ? comissaoTotal / comissoes.length : 0;

    // Mês atual e anterior
    const hojeMes = todayLocalISO().slice(0, 7);
    const idxAtual = mesesOrdenados.indexOf(hojeMes);
    const valorMesAtual = porMes[hojeMes]?.total || 0;
    const mesAnterior = idxAtual > 0 ? mesesOrdenados[idxAtual - 1] : mesesOrdenados[mesesOrdenados.length - 2];
    const valorMesAnterior = mesAnterior ? porMes[mesAnterior]?.total || 0 : 0;
    const variacaoMes = valorMesAnterior > 0
      ? ((valorMesAtual - valorMesAnterior) / valorMesAnterior) * 100
      : 0;

    // Previsão próximo mês: média móvel dos últimos 3 meses com comissão
    const ultimos3 = serieMensal.slice(-3);
    const previsaoProx = ultimos3.length
      ? ultimos3.reduce((s, x) => s + x.total, 0) / ultimos3.length
      : 0;

    // Top fornecedores
    const porFornecedor: Record<string, number> = {};
    for (const c of comissoes) {
      const parsed = parseObservacoes(c.observacoes);
      const f = (c.fornecedor || parsed.fornecedor || "Sem fornecedor").trim();
      porFornecedor[f] = (porFornecedor[f] || 0) + Number(c.valor);
    }
    const topFornecedores = Object.entries(porFornecedor)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nome, valor]) => ({ nome: nome.length > 22 ? nome.slice(0, 22) + "…" : nome, valor }));

    // Pendentes atrasados (mês ref > 30 dias atrás)
    const limite = new Date();
    limite.setDate(limite.getDate() - 30);
    const limiteMes = `${limite.getFullYear()}-${String(limite.getMonth() + 1).padStart(2, "0")}`;
    const pendentesAtrasados = comissoes.filter(c => !c.pago && c.mes && c.mes < limiteMes).length;

    // Donut data
    const donut = [
      { name: "Pago", value: comissaoPaga },
      { name: "Pendente", value: comissaoPendente },
    ];

    return {
      totalGasto, comissaoPaga, comissaoPendente, comissaoTotal, comissaoTeorica,
      porMes, mesesOrdenados, serieMensal,
      mediaMensal, mesMaior, mesMenor, ticketMedio,
      valorMesAtual, valorMesAnterior, variacaoMes,
      previsaoProx, topFornecedores, pendentesAtrasados, donut,
    };
  }, [transacoes, comissoes]);

  // ===== FILTRAGEM DA LISTA =====
  const filtered = useMemo(() => {
    const buscaLower = busca.trim().toLowerCase();
    let arr = comissoes.filter(c => {
      if (filtroStatus === "pago" && !c.pago) return false;
      if (filtroStatus === "pendente" && c.pago) return false;
      if (filtroMes !== "todos" && c.mes !== filtroMes) return false;
      if (filtroOrigem !== "todos") {
        const { tipo } = parseObservacoes(c.observacoes);
        if (tipo !== filtroOrigem) return false;
      }
      if (buscaLower) {
        const parsed = parseObservacoes(c.observacoes);
        const haystack = `${c.observacoes || ""} ${c.fornecedor || ""} ${parsed.fornecedor || ""} ${c.categoria || ""}`.toLowerCase();
        if (!haystack.includes(buscaLower)) return false;
      }
      return true;
    });
    arr = [...arr].sort((a, b) => {
      let av: number | string = 0, bv: number | string = 0;
      if (sortField === "valor") {
        av = Number(a.valor); bv = Number(b.valor);
      } else {
        av = a.data_pagamento || a.created_at || "";
        bv = b.data_pagamento || b.created_at || "";
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [comissoes, filtroStatus, filtroMes, filtroOrigem, busca, sortField, sortDir]);

  const handleQuickDelete = (c: ComissaoRow) => setDeleteTarget(c);
  const confirmQuickDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("obra_comissao_pagamentos")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", deleteTarget.id);
    setDeleteTarget(null);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Comissão excluída"); fetchData(); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedPendentes = useMemo(
    () => Array.from(selectedIds).filter(id => {
      const c = comissoes.find(x => x.id === id);
      return c && !c.pago;
    }),
    [selectedIds, comissoes]
  );

  const handleBulkPay = async () => {
    if (selectedPendentes.length === 0) return;
    setBulkLoading(true);
    const { error } = await supabase
      .from("obra_comissao_pagamentos")
      .update({ pago: true, data_pagamento: new Date().toISOString() } as any)
      .in("id", selectedPendentes);
    setBulkLoading(false);
    setConfirmBulkPay(false);
    if (error) toast.error("Erro ao marcar como pagas");
    else {
      toast.success(`${selectedPendentes.length} comissão(ões) marcadas como pagas`);
      setSelectedIds(new Set());
      fetchData();
    }
  };

  const exportCSV = () => {
    const headers = ["Mês", "Data Pgto", "Fornecedor", "Categoria", "Origem", "Valor Base", "Comissão", "Status", "Observações"];
    const rows = filtered.map(c => {
      const parsed = parseObservacoes(c.observacoes);
      const valorBase = Number(c.valor) / (PERCENTUAL_COMISSAO / 100);
      return [
        c.mes || "",
        c.data_pagamento || "",
        (c.fornecedor || parsed.fornecedor || "").replace(/"/g, '""'),
        (c.categoria || "").replace(/"/g, '""'),
        parsed.tipo,
        valorBase.toFixed(2),
        Number(c.valor).toFixed(2),
        c.pago ? "Pago" : "Pendente",
        (c.observacoes || "").replace(/"/g, '""'),
      ].map(v => `"${v}"`).join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comissao-${todayLocalISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  const toggleMonth = (m: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m); else next.add(m);
      return next;
    });
  };

  const toggleSort = (f: SortField) => {
    if (sortField === f) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(f); setSortDir("desc"); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const mesesParaFiltro = [...agg.mesesOrdenados].reverse();

  // Tooltip styler para gráficos (dark)
  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 12,
  };

  const PIE_COLORS = ["hsl(var(--success))", "hsl(var(--warning))"];

  return (
    <div className="space-y-6 animate-slide-in pb-10">
      {/* Header */}
      <div className="page-header flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Comissão</h1>
          <p className="text-sm text-muted-foreground">
            Comissão do construtor — {PERCENTUAL_COMISSAO}% sobre gastos · controle mês a mês
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="px-3 py-2 rounded-lg bg-accent/50 hover:bg-accent text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="stat-card-primary p-5 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground uppercase">Comissão Total</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(agg.comissaoTotal)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            8% sobre {formatCurrency(agg.totalGasto)} de gastos
          </p>
        </div>

        <div className="stat-card-success p-5 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-success" />
            <span className="text-xs text-muted-foreground uppercase">Pago</span>
          </div>
          <p className="text-2xl font-bold text-success">{formatCurrency(agg.comissaoPaga)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {comissoes.filter(c => c.pago).length} lançamento(s) ·{" "}
            {agg.comissaoTotal > 0 ? `${((agg.comissaoPaga / agg.comissaoTotal) * 100).toFixed(1)}%` : "0%"} do total
          </p>
        </div>

        <div className="stat-card-warning p-5 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-warning" />
            <span className="text-xs text-muted-foreground uppercase">Pendente</span>
          </div>
          <p className="text-2xl font-bold text-warning">{formatCurrency(agg.comissaoPendente)}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[11px] text-muted-foreground">
              {comissoes.filter(c => !c.pago).length} lançamento(s)
            </p>
            {agg.pendentesAtrasados > 0 && (
              <span className="badge-danger text-[9px] inline-flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5" /> {agg.pendentesAtrasados} atrasado(s)
              </span>
            )}
          </div>
        </div>

        <div className="stat-card-info p-5 animate-fade-in-up" style={{ animationDelay: "180ms" }}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-info" />
            <span className="text-xs text-muted-foreground uppercase">Este Mês</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(agg.valorMesAtual)}</p>
          <p className="text-[11px] mt-1 flex items-center gap-1">
            {agg.valorMesAnterior > 0 ? (
              <>
                <span className={agg.variacaoMes >= 0 ? "text-warning" : "text-success"}>
                  {agg.variacaoMes >= 0 ? "▲" : "▼"} {Math.abs(agg.variacaoMes).toFixed(1)}%
                </span>
                <span className="text-muted-foreground">vs mês anterior ({formatCurrency(agg.valorMesAnterior)})</span>
              </>
            ) : (
              <span className="text-muted-foreground">sem comparativo</span>
            )}
          </p>
        </div>
      </div>

      {/* KPIs secundários */}
      <div className="glass-card p-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
        {[
          { icon: <TrendingUp className="w-3.5 h-3.5" />, label: "Média Mensal", value: formatCurrency(agg.mediaMensal) },
          { icon: <ArrowUp className="w-3.5 h-3.5 text-success" />, label: "Mês Maior", value: agg.mesMaior ? `${formatMes(agg.mesMaior)} · ${formatCurrency(agg.porMes[agg.mesMaior].total)}` : "—" },
          { icon: <ArrowDown className="w-3.5 h-3.5 text-warning" />, label: "Mês Menor", value: agg.mesMenor ? `${formatMes(agg.mesMenor)} · ${formatCurrency(agg.porMes[agg.mesMenor].total)}` : "—" },
          { icon: <DollarSign className="w-3.5 h-3.5" />, label: "Ticket Médio", value: formatCurrency(agg.ticketMedio) },
          { icon: <Calendar className="w-3.5 h-3.5 text-info" />, label: "Previsão Próx. Mês", value: formatCurrency(agg.previsaoProx) },
        ].map(k => (
          <div key={k.label} className="px-2">
            <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground uppercase mb-1">
              {k.icon} {k.label}
            </div>
            <p className="text-sm font-semibold truncate">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar de quitação */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Quitação da Comissão</span>
          <span className="text-sm font-bold text-primary">
            {agg.comissaoTotal > 0 ? `${((agg.comissaoPaga / agg.comissaoTotal) * 100).toFixed(1)}%` : "0%"}
          </span>
        </div>
        <Progress value={agg.comissaoTotal > 0 ? Math.min((agg.comissaoPaga / agg.comissaoTotal) * 100, 100) : 0} className="h-3" />
        <p className="text-[11px] text-muted-foreground mt-2">
          Referência teórica ({PERCENTUAL_COMISSAO}% sobre {formatCurrency(agg.totalGasto)}) ={" "}
          <span className="font-medium text-foreground">{formatCurrency(agg.comissaoTeorica)}</span>
          {agg.comissaoTotal < agg.comissaoTeorica && (
            <> · faltam <span className="text-warning font-medium">{formatCurrency(agg.comissaoTeorica - agg.comissaoTotal)}</span> de comissões a registrar</>
          )}
        </p>
      </div>

      {/* Gráfico A: Comissão mês a mês */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold mb-4">Comissão mês a mês</h2>
        {agg.serieMensal.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados para exibir</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={agg.serieMensal} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="mesLabel" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number, name: string) => [formatCurrency(v), name]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="pago" stackId="a" fill="hsl(var(--success))" name="Pago" radius={[0, 0, 0, 0]} />
              <Bar dataKey="pendente" stackId="a" fill="hsl(var(--warning))" name="Pendente" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="teorica" stroke="hsl(var(--primary))" strokeWidth={2} name="Teórica (8% gastos)" dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Gráfico B: Acumulado */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold mb-4">Evolução acumulada</h2>
        {agg.serieMensal.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados para exibir</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={agg.serieMensal} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gPago" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="mesLabel" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [formatCurrency(v), name]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="acumTotal" stroke="hsl(var(--primary))" fill="url(#gTotal)" name="Acumulado Total" />
              <Area type="monotone" dataKey="acumPago" stroke="hsl(var(--success))" fill="url(#gPago)" name="Acumulado Pago" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Donut + Top fornecedores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-4">Distribuição por status</h2>
          {agg.comissaoTotal === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={agg.donut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {agg.donut.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-4">Top 5 fornecedores (geradores de comissão)</h2>
          {agg.topFornecedores.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={agg.topFornecedores} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={130} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Resumo Mensal (accordion) */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold mb-4">Resumo mensal</h2>
        {agg.serieMensal.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Sem meses para exibir</p>
        ) : (
          <div className="space-y-1.5">
            <div className="grid grid-cols-12 gap-2 text-[10px] uppercase text-muted-foreground px-3 pb-2 border-b border-border/50">
              <div className="col-span-3">Mês</div>
              <div className="col-span-1 text-center">Lanç.</div>
              <div className="col-span-2 text-right">Pago</div>
              <div className="col-span-2 text-right">Pendente</div>
              <div className="col-span-2 text-right">Total</div>
              <div className="col-span-2 text-right">Quitado</div>
            </div>
            {[...agg.serieMensal].reverse().map(m => {
              const isOpen = expandedMonths.has(m.mes);
              const pct = m.total > 0 ? (m.pago / m.total) * 100 : 0;
              const lancamentosDoMes = comissoes.filter(c => c.mes === m.mes);
              return (
                <div key={m.mes} className="rounded-lg border border-border/40 overflow-hidden">
                  <button
                    onClick={() => toggleMonth(m.mes)}
                    className="w-full grid grid-cols-12 gap-2 items-center px-3 py-2.5 text-sm hover:bg-accent/30 transition-colors"
                  >
                    <div className="col-span-3 flex items-center gap-1.5 font-medium">
                      {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      {m.mesLabel}
                    </div>
                    <div className="col-span-1 text-center text-muted-foreground">{m.count}</div>
                    <div className="col-span-2 text-right text-success">{formatCurrency(m.pago)}</div>
                    <div className="col-span-2 text-right text-warning">{formatCurrency(m.pendente)}</div>
                    <div className="col-span-2 text-right font-bold">{formatCurrency(m.total)}</div>
                    <div className="col-span-2 text-right text-xs">
                      <span className={pct >= 100 ? "text-success font-medium" : "text-muted-foreground"}>{pct.toFixed(0)}%</span>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="bg-background/40 border-t border-border/30 px-3 py-2 space-y-1">
                      {lancamentosDoMes.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">Sem lançamentos neste mês.</p>
                      ) : lancamentosDoMes.map(c => {
                        const parsed = parseObservacoes(c.observacoes);
                        return (
                          <div
                            key={c.id}
                            onClick={() => { setSelected(c); setDrawerOpen(true); }}
                            className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-accent/40 cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {c.pago
                                ? <CheckCircle className="w-3 h-3 text-success shrink-0" />
                                : <Clock className="w-3 h-3 text-warning shrink-0" />}
                              <span className="truncate">{c.observacoes || c.fornecedor || parsed.fornecedor || "Sem descrição"}</span>
                            </div>
                            <span className="font-semibold ml-2">{formatCurrency(Number(c.valor))}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detalhamento + filtros */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-semibold">Detalhamento de Pagamentos ({filtered.length})</h2>
          {selectedPendentes.length > 0 && (
            <button
              onClick={() => setConfirmBulkPay(true)}
              className="px-3 py-1.5 rounded-lg bg-success text-success-foreground text-xs font-medium flex items-center gap-1.5 hover:bg-success/90 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Marcar {selectedPendentes.length} como pagas
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar fornecedor, descrição..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <select
            value={filtroMes}
            onChange={e => setFiltroMes(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="todos">Todos os meses</option>
            {mesesParaFiltro.map(m => <option key={m} value={m}>{formatMes(m)}</option>)}
          </select>
          <select
            value={filtroOrigem}
            onChange={e => setFiltroOrigem(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="todos">Todas as origens</option>
            <option value="NF">NF</option>
            <option value="Orçamento">Orçamento</option>
            <option value="Compra">Compra</option>
            <option value="Manual">Manual</option>
          </select>
          <div className="flex gap-1">
            {(["todos", "pago", "pendente"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltroStatus(f)}
                className={`flex-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  filtroStatus === f ? "bg-primary text-primary-foreground" : "bg-accent/50 text-muted-foreground hover:bg-accent"
                }`}
              >
                {f === "todos" ? "Todos" : f === "pago" ? "Pagos" : "Pendentes"}
              </button>
            ))}
          </div>
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>Ordenar por:</span>
          <button
            onClick={() => toggleSort("data")}
            className={`px-2 py-0.5 rounded ${sortField === "data" ? "bg-accent text-foreground" : ""}`}
          >
            Data {sortField === "data" && (sortDir === "asc" ? "↑" : "↓")}
          </button>
          <button
            onClick={() => toggleSort("valor")}
            className={`px-2 py-0.5 rounded ${sortField === "valor" ? "bg-accent text-foreground" : ""}`}
          >
            Valor {sortField === "valor" && (sortDir === "asc" ? "↑" : "↓")}
          </button>
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum lançamento encontrado</p>
        ) : (
          <div className="space-y-1">
            {filtered.map((c, i) => {
              const parsed = parseObservacoes(c.observacoes);
              const displayFornecedor = c.fornecedor || parsed.fornecedor;
              const valorBase = Number(c.valor) / (PERCENTUAL_COMISSAO / 100);
              const limite = new Date();
              limite.setDate(limite.getDate() - 30);
              const limiteMes = `${limite.getFullYear()}-${String(limite.getMonth() + 1).padStart(2, "0")}`;
              const atrasado = !c.pago && c.mes && c.mes < limiteMes;
              const isSelected = selectedIds.has(c.id);

              return (
                <div
                  key={c.id}
                  className={`flex items-center justify-between py-3 px-3 rounded-lg transition-colors animate-fade-in-up ${
                    isSelected ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-accent/50"
                  }`}
                  style={{ animationDelay: `${Math.min(i * 20, 400)}ms` }}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(c.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div
                      onClick={() => { setSelected(c); setDrawerOpen(true); }}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${c.pago ? "bg-success/10" : "bg-warning/10"}`}>
                        {c.pago ? <CheckCircle className="w-4 h-4 text-success" /> : <Clock className="w-4 h-4 text-warning" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">
                            {c.observacoes || c.mes || "Sem referência"}
                          </p>
                          <OrigemBadgeSmall obs={c.observacoes} />
                          {atrasado && (
                            <span className="badge-danger text-[9px] inline-flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" /> Atrasado
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {displayFornecedor && (
                            <span className="text-[11px] text-muted-foreground truncate max-w-[160px]">{displayFornecedor}</span>
                          )}
                          {c.mes && <span className="text-[10px] text-muted-foreground/60">· {formatMes(c.mes)}</span>}
                          {c.pago
                            ? <span className="badge-success text-[9px]">Pago</span>
                            : <span className="badge-warning text-[9px]">Pendente</span>}
                          {c.auto && <span className="badge-info text-[9px]">Auto</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatCurrency(Number(c.valor))}</p>
                      <p className="text-[10px] text-muted-foreground">de {formatCurrency(valorBase)}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleQuickDelete(c); }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ComissaoDetailDrawer comissao={selected} open={drawerOpen} onOpenChange={setDrawerOpen} onUpdate={fetchData} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir Comissão"
        message={`Deseja excluir o lançamento de ${deleteTarget ? formatCurrency(Number(deleteTarget.valor)) : ""}?`}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={confirmQuickDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={confirmBulkPay}
        title="Marcar como pagas"
        message={`Confirmar pagamento de ${selectedPendentes.length} comissão(ões)? A data de pagamento será definida como hoje.`}
        confirmLabel={bulkLoading ? "Processando..." : "Confirmar"}
        variant="warning"
        onConfirm={handleBulkPay}
        onCancel={() => setConfirmBulkPay(false)}
      />
    </div>
  );
}
