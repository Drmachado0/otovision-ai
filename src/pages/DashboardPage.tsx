import { useCallback, useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { formatCurrency, formatPercent, formatDate, todayLocalISO, parseLocalDate } from "@/lib/formatters";
import {
  DollarSign, TrendingDown, Wallet, Activity, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Ruler,
  ArrowRight, CreditCard, ShoppingCart,
  Landmark, Receipt, Clock, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import OrigemBadge from "@/components/OrigemBadge";
import TransacaoDetailDrawer, { type TransacaoFull } from "@/components/TransacaoDetailDrawer";
import { calcularResumoCompras } from "@/lib/financeiro";
import { flattenParcelasPendentes, type CompraComParcelas } from "@/lib/contasAPagarParcelas";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

interface TransacaoRow {
  id: string;
  tipo: string;
  valor: number;
  categoria: string;
  data: string;
  descricao: string;
  forma_pagamento: string;
  observacoes: string;
  origem_tipo?: string | null;
  conciliado?: boolean;
  recorrencia?: string;
  conta_id?: string;
  referencia?: string;
  created_at?: string;
}

interface ConfigRow {
  orcamento_total: number;
  area_construida: number;
  data_inicio: string;
  data_termino: string;
  nome_obra: string;
}

interface ContaRow {
  id: string;
  nome: string;
  tipo: string;
  cor: string;
  saldo_inicial: number;
  ativa: boolean;
}

export default function DashboardPage() {
  const [config, setConfig] = useState<ConfigRow>({ orcamento_total: 0, area_construida: 0, data_inicio: "", data_termino: "", nome_obra: "" });
  const [totalGasto, setTotalGasto] = useState(0);
  const [totalEntradas, setTotalEntradas] = useState(0);
  const [transacoes, setTransacoes] = useState<TransacaoRow[]>([]);
  const [comprasPendentes, setComprasPendentes] = useState(0);
  const [comprasTotal, setComprasTotal] = useState(0);
  const [comprasAPagar, setComprasAPagar] = useState(0);
  const [comissoesPendentes, setComissoesPendentes] = useState(0);
  const [comissoesPagas, setComissoesPagas] = useState(0);
  const [contas, setContas] = useState<ContaRow[]>([]);
  const [allTransForContas, setAllTransForContas] = useState<{ tipo: string; valor: number; conta_id?: string }[]>([]);
  const [gastosPorCategoria, setGastosPorCategoria] = useState<{ categoria: string; total: number }[]>([]);
  const [contasPagar, setContasPagar] = useState<{ total: number; count: number; vencidas: number }>({ total: 0, count: 0, vencidas: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedTransacao, setSelectedTransacao] = useState<TransacaoFull | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
    const [configRes, allTransRes, recentTransRes, comprasRes, comissoesRes, contasRes, pendentesRes] = await Promise.all([
      supabase.from("obra_config").select("orcamento_total, area_construida, data_inicio, data_termino, nome_obra").limit(1).maybeSingle(),
      // BUG-001/003: Total Gasto = todas as transacoes (pagas + pendentes),
      // alinhado com Previsao/Curva ABC/Relatorios/Comissao
      supabase.from("obra_transacoes_fluxo").select("tipo, valor, categoria, conta_id, status" as any).is("deleted_at", null).neq("status" as any, "cancelado"),
      // Recent 5 for display (all statuses)
      supabase.from("obra_transacoes_fluxo").select("id, tipo, valor, categoria, data, descricao, forma_pagamento, observacoes, origem_tipo, conciliado, recorrencia, conta_id, referencia, created_at" as any).is("deleted_at", null).order("data", { ascending: false }).limit(5),
      supabase.from("obra_compras").select("valor_total, status_entrega, numero_parcelas, parcelas, observacoes").is("deleted_at", null),
      supabase.from("obra_comissao_pagamentos").select("valor, pago").is("deleted_at", null),
      supabase.from("obra_contas_financeiras").select("id, nome, tipo, cor, saldo_inicial, ativa").eq("ativa", true),
      // Contas a pagar (pending)
      supabase.from("obra_transacoes_fluxo").select("valor, data_vencimento" as any).is("deleted_at", null).eq("status" as any, "pendente").eq("tipo", "Saída"),
    ]);

    if (configRes.data) setConfig(configRes.data as ConfigRow);

    // Saldo inicial total das contas ativas (base de caixa)
    const saldoInicialTotal = (contasRes.data ?? []).reduce(
      (s, c: { saldo_inicial: number | string }) => s + Number(c.saldo_inicial || 0),
      0
    );

    // Parcelas pendentes de compras (compromissos futuros que ainda não viraram lançamento no fluxo)
    const parcelasPendentes = flattenParcelasPendentes(((comprasRes.data ?? []) as unknown) as CompraComParcelas[]);
    const totalParcelasPend = parcelasPendentes.reduce((s, p) => s + Number(p.valor), 0);

    if (allTransRes.data) {
      const rows = allTransRes.data as unknown as { tipo: string; valor: number; categoria: string; conta_id?: string }[];
      setAllTransForContas(rows);
      const saidas = rows.filter(t => t.tipo === "Saída");
      // Total Gasto inclui parcelas pendentes de compras parceladas (compromissos confirmados)
      setTotalGasto(saidas.reduce((s, t) => s + Number(t.valor), 0) + totalParcelasPend);
      const entradasOp = rows.filter(t => t.tipo === "Entrada").reduce((s, t) => s + Number(t.valor), 0);
      // Total Entradas inclui o saldo inicial das contas ativas
      setTotalEntradas(saldoInicialTotal + entradasOp);

      // Top 5 categories by spending (inclui parcelas pendentes)
      const catMap: Record<string, number> = {};
      saidas.forEach(t => { catMap[t.categoria || "Sem categoria"] = (catMap[t.categoria || "Sem categoria"] || 0) + Number(t.valor); });
      parcelasPendentes.forEach(p => { catMap[p.categoria || "Sem categoria"] = (catMap[p.categoria || "Sem categoria"] || 0) + Number(p.valor); });
      const sorted = Object.entries(catMap).map(([categoria, total]) => ({ categoria, total })).sort((a, b) => b.total - a.total).slice(0, 5);
      setGastosPorCategoria(sorted);
    }

    if (recentTransRes.data) setTransacoes(recentTransRes.data as unknown as TransacaoRow[]);

    if (comprasRes.data) {
      const resumo = calcularResumoCompras(comprasRes.data as never);
      setComprasTotal(resumo.totalCompromissado);
      setComprasAPagar(resumo.totalAPagar);
      setComprasPendentes(resumo.pendentesEntrega);
    }

    if (comissoesRes.data) {
      const comRows = comissoesRes.data as { valor: number; pago: boolean }[];
      const pagas = comRows.filter(x => x.pago).reduce((s, x) => s + Number(x.valor), 0);
      const pendentes = comRows.filter(x => !x.pago).reduce((s, x) => s + Number(x.valor), 0);
      setComissoesPagas(pagas);
      // Pendente reflete apenas comissões existentes (não excluídas) — exclusão reduz imediatamente.
      setComissoesPendentes(pendentes);
    }

    if (contasRes.data) setContas(contasRes.data as ContaRow[]);

    if (pendentesRes.data) {
      const pRows = pendentesRes.data as unknown as { valor: number; data_vencimento: string | null }[];
      const todayStr = todayLocalISO();
      // Inclui parcelas pendentes de obra_compras (compromissos ainda não lançados no fluxo)
      const parcelasVirtuais = flattenParcelasPendentes((comprasRes.data ?? []) as unknown as CompraComParcelas[]);
      const combinadas = [
        ...pRows,
        ...parcelasVirtuais.map(p => ({ valor: p.valor, data_vencimento: p.data_vencimento })),
      ];
      setContasPagar({
        total: combinadas.reduce((s, r) => s + Number(r.valor), 0),
        count: combinadas.length,
        vencidas: combinadas.filter(r => r.data_vencimento && r.data_vencimento < todayStr).length,
      });
    }

    } catch (err) {
      console.error("DashboardPage fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Re-fetch when tab/window regains focus + polling every 30s
  useEffect(() => {
    const onFocus = () => fetchData();
    window.addEventListener("focus", onFocus);
    const interval = setInterval(fetchData, 30000);
    return () => { window.removeEventListener("focus", onFocus); clearInterval(interval); };
  }, [fetchData]);
  useRealtimeSubscription("obra_transacoes_fluxo", fetchData);
  useRealtimeSubscription("obra_config", fetchData);
  useRealtimeSubscription("obra_compras", fetchData);
  useRealtimeSubscription("obra_comissao_pagamentos", fetchData);
  useRealtimeSubscription("obra_contas_financeiras", fetchData);

  const orcamentoTotal = config.orcamento_total;
  const saldo = orcamentoTotal - totalGasto;
  const percentual = orcamentoTotal > 0 ? (totalGasto / orcamentoTotal) * 100 : 0;

  const kpis = useMemo(() => {
    const area = config.area_construida || 1;
    const custoM2 = totalGasto / area;
    return { custoM2 };
  }, [totalGasto, config]);

  const alerts: string[] = [];
  if (percentual > 90) alerts.push("⚠️ Orçamento acima de 90%!");
  if (percentual > 100) alerts.push("🚨 Orçamento ULTRAPASSADO!");
  if (comissoesPendentes > 0) alerts.push(`💰 ${formatCurrency(comissoesPendentes)} em comissões pendentes`);

  if (loading) {
    return (
      <div className="space-y-6 animate-slide-in">
        <div><div className="h-7 w-40 rounded bg-muted animate-pulse" /><div className="h-4 w-64 rounded bg-muted animate-pulse mt-2" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-5 space-y-3 animate-pulse">
              <div className="flex justify-between"><div className="h-3 w-20 rounded bg-muted" /><div className="h-5 w-5 rounded bg-muted" /></div>
              <div className="h-6 w-28 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Dynamic Header */}
      <div className="page-header">
        <h1 className="text-2xl font-bold">{config.nome_obra || "Dashboard Executivo"}</h1>
        <p className="text-sm text-muted-foreground">
          {config.data_inicio && config.data_termino
            ? `${formatDate(config.data_inicio)} → ${formatDate(config.data_termino)}`
            : "Visão macro da obra"}
          {config.area_construida > 0 && ` · ${config.area_construida} m²`}
          {(() => {
            if (!config.data_termino) return null;
            const fim = parseLocalDate(config.data_termino);
            const hoje = parseLocalDate(todayLocalISO());
            const dias = Math.round((fim.getTime() - hoje.getTime()) / 86400000);
            if (isNaN(dias)) return null;
            if (dias < 0) return <span className="text-destructive"> · {Math.abs(dias)} dias em atraso</span>;
            if (dias === 0) return <span className="text-warning"> · termina hoje</span>;
            return <span> · {dias} {dias === 1 ? "dia restante" : "dias restantes"}</span>;
          })()}
        </p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {a}
            </div>
          ))}
        </div>
      )}

      {/* Atalho Leitor IA */}
      <Link
        to="/leitor-ia"
        className="glass-card p-4 flex items-center justify-between border border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all animate-fade-in-up"
        style={{ animationDelay: "50ms" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Leitor IA</p>
            <p className="text-xs text-muted-foreground">Envie nota fiscal, recibo ou extrato — extração automática</p>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-muted-foreground" />
      </Link>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { variant: "info" as const, label: "Orçamento Total", value: formatCurrency(orcamentoTotal), icon: <DollarSign className="w-5 h-5" />, to: "/configuracoes" },
          { variant: "danger" as const, label: "Total Gasto", value: formatCurrency(totalGasto), icon: <TrendingDown className="w-5 h-5" />, sub: `${formatPercent(percentual)} executado`, to: "/fluxo" },
          { variant: "success" as const, label: "Saldo do Orçamento", value: formatCurrency(saldo), icon: <Wallet className="w-5 h-5" />, to: "/relatorios" },
          { variant: "warning" as const, label: "Total Entradas", value: formatCurrency(totalEntradas), icon: <Activity className="w-5 h-5" />, to: "/fluxo" },
        ].map((card, i) => (
          <StatCard key={card.label} {...card} delay={i * 100} />
        ))}
      </div>

      {/* Custo/m² + Contas a Pagar — destaque */}
      <div className={`grid grid-cols-1 gap-4 ${contasPagar.count > 0 ? "md:grid-cols-2" : ""}`}>
        {/* Custo/m² */}
        <Link
          to="/relatorios"
          className="group relative overflow-hidden glass-card p-5 animate-fade-in-up hover:bg-accent/20 transition-all hover:-translate-y-0.5"
          style={{ animationDelay: "400ms" }}
        >
          <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-primary/40" />
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/10 blur-2xl group-hover:bg-primary/20 transition-colors" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15 ring-1 ring-primary/30">
                  <Ruler className="w-4 h-4 text-primary" />
                </span>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.14em]">Custo / m²</span>
              </div>
              <p className="text-3xl font-bold tracking-tight text-foreground">{formatCurrency(kpis.custoM2)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {config.area_construida > 0 ? `${config.area_construida} m² construídos` : "Defina a área em Configurações"}
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </Link>

        {/* Contas a Pagar */}
        {contasPagar.count > 0 && (
          <Link
            to="/contas-pagar"
            className="group relative overflow-hidden glass-card p-5 animate-fade-in-up hover:bg-accent/20 transition-all hover:-translate-y-0.5"
            style={{ animationDelay: "500ms" }}
          >
            <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-warning to-warning/40" />
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-warning/10 blur-2xl group-hover:bg-warning/20 transition-colors" />
            <div className="relative flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-warning/15 ring-1 ring-warning/30">
                    <Clock className="w-4 h-4 text-warning" />
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.14em]">Contas a Pagar</span>
                </div>
                <p className="text-3xl font-bold tracking-tight text-warning">{formatCurrency(contasPagar.total)}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-warning/10 text-warning ring-1 ring-warning/20">
                    {contasPagar.count} pendente{contasPagar.count > 1 ? "s" : ""}
                  </span>
                  {contasPagar.vencidas > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-destructive/10 text-destructive ring-1 ring-destructive/20">
                      {contasPagar.vencidas} vencida{contasPagar.vencidas > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground/60 group-hover:text-warning group-hover:translate-x-1 transition-all" />
            </div>
          </Link>
        )}
      </div>

      {/* Compras, Comissões, Contas row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Compras */}
        <Link to="/compras" className="glass-card p-4 hover:bg-accent/30 transition-colors animate-fade-in-up" style={{ animationDelay: "750ms" }}>
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Compras a Pagar</span>
          </div>
          <p className="text-lg font-bold">{formatCurrency(comprasAPagar)}</p>
          <p className="text-[10px] text-muted-foreground">
            {comprasPendentes} pendente(s) · {formatCurrency(comprasTotal)} compromissado
          </p>
        </Link>

        {/* Comissões */}
        <Link to="/comissao" className="glass-card p-4 hover:bg-accent/30 transition-colors animate-fade-in-up" style={{ animationDelay: "800ms" }}>
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="w-4 h-4 text-warning" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Comissões a Pagar</span>
          </div>
          <p className={`text-lg font-bold ${comissoesPendentes > 0 ? "text-warning" : ""}`}>{formatCurrency(comissoesPendentes)}</p>
          <p className="text-[10px] text-muted-foreground">pendente de pagamento</p>
        </Link>

        {/* Contas */}
        <Link to="/contas" className="glass-card p-4 hover:bg-accent/30 transition-colors animate-fade-in-up" style={{ animationDelay: "850ms" }}>
          <div className="flex items-center gap-2 mb-2">
            <Landmark className="w-4 h-4 text-info" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Contas Ativas</span>
          </div>
          <div className="space-y-1">
            {contas.slice(0, 3).map(c => {
              const movs = allTransForContas.filter(t => t.conta_id === c.id);
              const entradas = movs.filter(t => t.tipo === "Entrada").reduce((s, t) => s + Number(t.valor), 0);
              const saidas = movs.filter(t => t.tipo === "Saída").reduce((s, t) => s + Number(t.valor), 0);
              const saldoConta = Number(c.saldo_inicial) + entradas - saidas;
              return (
                <div key={c.id} className="flex items-center justify-between">
                  <span className="text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.cor }} />
                    {c.nome}
                  </span>
                  <span className={`text-xs font-medium ${saldoConta >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(saldoConta)}</span>
                </div>
              );
            })}
          </div>
        </Link>
      </div>

      {/* Budget Progress */}
      <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: "900ms" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Progresso do Orçamento</span>
          <span className="text-sm font-bold text-primary">{formatPercent(Math.min(percentual, 100))}</span>
        </div>
        <div className="h-3 rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              percentual > 100 ? "bg-destructive" : percentual > 80 ? "bg-warning" : "bg-primary"
            }`}
            style={{ width: `${Math.min(percentual, 100)}%` }}
          />
        </div>
      </div>

      {/* Charts Row */}
      {(gastosPorCategoria.length > 0 || orcamentoTotal > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Donut: Orcamento */}
          {orcamentoTotal > 0 && (
            <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: "900ms" }}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">Orçamento</h2>
                <span className="text-[10px] text-muted-foreground">
                  {((Math.min(totalGasto, orcamentoTotal) / orcamentoTotal) * 100).toFixed(1)}% usado
                </span>
              </div>
              <div className="relative h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Gasto", value: Math.min(totalGasto, orcamentoTotal) },
                        { name: "Restante", value: Math.max(orcamentoTotal - totalGasto, 0) },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={78}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      <Cell fill="hsl(25 95% 58%)" />
                      <Cell fill="hsl(160 60% 45%)" />
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(222 47% 9%)", border: "1px solid hsl(222 30% 20%)", borderRadius: "8px", fontSize: "12px", color: "hsl(0 0% 98%)" }}
                      itemStyle={{ color: "hsl(0 0% 98%)" }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Gasto</span>
                  <span className="text-base font-bold text-foreground">{formatCurrency(totalGasto)}</span>
                  <span className="text-[10px] text-muted-foreground">de {formatCurrency(orcamentoTotal)}</span>
                </div>
              </div>
              <div className="flex justify-center gap-4 text-xs mt-2">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(25 95% 58%)" }} /><span className="text-foreground/80">Gasto</span></span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(160 60% 45%)" }} /><span className="text-foreground/80">Restante</span></span>
              </div>
            </div>
          )}

          {/* Bar Chart: Top Categorias */}
          {gastosPorCategoria.length > 0 && (
            <div className="glass-card p-5 lg:col-span-2 animate-fade-in-up" style={{ animationDelay: "950ms" }}>
              <h2 className="text-sm font-semibold mb-2">Gastos por Categoria</h2>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gastosPorCategoria} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 16%)" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="categoria"
                      width={100}
                      tick={{ fontSize: 11, fill: "hsl(215 20% 55%)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ background: "hsl(222 47% 9%)", border: "1px solid hsl(222 30% 16%)", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey="total" fill="hsl(165 82% 51%)" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent transactions */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Últimas Transações</h2>
          <Link to="/fluxo">
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-primary">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
        {transacoes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma transação registrada</p>
        ) : (
          <div className="space-y-1">
            {transacoes.map((t, i) => (
              <div
                key={t.id}
                onClick={() => { setSelectedTransacao(t as TransacaoFull); setDrawerOpen(true); }}
                className="flex items-center justify-between py-2.5 px-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-accent/50 animate-fade-in-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.tipo === "Entrada" ? "bg-success/10" : "bg-destructive/10"}`}>
                    {t.tipo === "Entrada" ? <ArrowUpRight className="w-4 h-4 text-success" /> : <ArrowDownRight className="w-4 h-4 text-destructive" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.descricao || t.categoria || "Sem descrição"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground">{t.categoria}</p>
                      {t.forma_pagamento && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <CreditCard className="w-2.5 h-2.5" />{t.forma_pagamento}
                        </span>
                      )}
                      <OrigemBadge origem={t.origem_tipo} compact />
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-semibold ${t.tipo === "Entrada" ? "text-success" : "text-destructive"}`}>
                    {t.tipo === "Entrada" ? "+" : "-"}{formatCurrency(Number(t.valor))}
                  </span>
                  <p className="text-[10px] text-muted-foreground">{formatDate(t.data)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TransacaoDetailDrawer
        transacao={selectedTransacao}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onUpdated={fetchData}
      />
    </div>
  );
}

function StatCard({ variant, label, value, icon, sub, delay = 0, to }: {
  variant: "success" | "danger" | "info" | "warning";
  label: string; value: string; icon: React.ReactNode; sub?: string; delay?: number; to?: string;
}) {
  const classes = { success: "stat-card-success", danger: "stat-card-danger", info: "stat-card-info", warning: "stat-card-warning" };
  const iconColor = { success: "text-success", danger: "text-destructive", info: "text-info", warning: "text-warning" };
  const inner = (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={iconColor[variant]}>{icon}</div>
      </div>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </>
  );
  const className = `${classes[variant]} p-5 animate-fade-in-up ${to ? "hover:bg-accent/30 transition-colors block" : ""}`;
  const style = { animationDelay: `${delay}ms` };
  return to ? (
    <Link to={to} className={className} style={style}>{inner}</Link>
  ) : (
    <div className={className} style={style}>{inner}</div>
  );
}

function MiniKPI({ cls, icon, label, value, sub, delay = 0, to }: {
  cls: string; icon: React.ReactNode; label: string; value: string; sub?: string; delay?: number; to?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-bold">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </>
  );
  const className = `${cls} p-4 animate-fade-in-up ${to ? "hover:bg-accent/30 transition-colors block" : ""}`;
  const style = { animationDelay: `${delay}ms` };
  return to ? (
    <Link to={to} className={className} style={style}>{inner}</Link>
  ) : (
    <div className={className} style={style}>{inner}</div>
  );
}
