import { lazy, Suspense, useCallback, useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { formatCurrency, todayLocalISO } from "@/lib/formatters";
import TransacaoDetailDrawer, { type TransacaoFull } from "@/components/TransacaoDetailDrawer";
import { calcularResumoCompras } from "@/lib/financeiro";
import { flattenParcelasPendentes, type CompraComParcelas } from "@/lib/contasAPagarParcelas";
import { CONFIG_DEFAULT, type TransacaoRow, type ConfigRow, type ContaRow } from "./dashboard/types";
import { DashboardHeader } from "./dashboard/DashboardHeader";
import { DashboardAlerts } from "./dashboard/DashboardAlerts";
import { LeitorIACard } from "./dashboard/LeitorIACard";
import { MainKpis } from "./dashboard/MainKpis";
import { CustoContasPagar } from "./dashboard/CustoContasPagar";
import { ResumoCards } from "./dashboard/ResumoCards";
import { BudgetProgress } from "./dashboard/BudgetProgress";
import { RecentTransactions } from "./dashboard/RecentTransactions";

// Charts live below the fold — lazy-load so the `vendor-charts` chunk doesn't
// block the dashboard shell (KPIs, alerts, recent transactions) from rendering.
const DashboardCharts = lazy(() => import("@/components/charts/DashboardCharts"));

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTransacao, setSelectedTransacao] = useState<TransacaoFull | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: dash, isLoading: loading, isError } = useQuery({
    queryKey: ["dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
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

      const config = (configRes.data as ConfigRow) ?? CONFIG_DEFAULT;

      // Saldo inicial total das contas ativas (base de caixa)
      const saldoInicialTotal = (contasRes.data ?? []).reduce(
        (s, c: { saldo_inicial: number | string }) => s + Number(c.saldo_inicial || 0),
        0
      );

      // Parcelas pendentes de compras (compromissos futuros que ainda não viraram lançamento no fluxo)
      const parcelasPendentes = flattenParcelasPendentes(((comprasRes.data ?? []) as unknown) as CompraComParcelas[]);
      const totalParcelasPend = parcelasPendentes.reduce((s, p) => s + Number(p.valor), 0);

      const rows = (allTransRes.data ?? []) as unknown as { tipo: string; valor: number; categoria: string; conta_id?: string }[];
      // Ajustes de saldo são meras correções contábeis — não devem entrar em Total Gasto nem Total Entradas
      const semAjuste = rows.filter(t => (t.categoria || "") !== "Ajuste de saldo");
      const saidas = semAjuste.filter(t => t.tipo === "Saída");
      // Total Gasto inclui parcelas pendentes de compras parceladas (compromissos confirmados)
      const totalGasto = saidas.reduce((s, t) => s + Number(t.valor), 0) + totalParcelasPend;
      const entradasOp = semAjuste.filter(t => t.tipo === "Entrada").reduce((s, t) => s + Number(t.valor), 0);
      // Total Entradas inclui o saldo inicial das contas ativas
      const totalEntradas = saldoInicialTotal + entradasOp;

      // Top 5 categories by spending (inclui parcelas pendentes)
      const catMap: Record<string, number> = {};
      saidas.forEach(t => { catMap[t.categoria || "Sem categoria"] = (catMap[t.categoria || "Sem categoria"] || 0) + Number(t.valor); });
      parcelasPendentes.forEach(p => { catMap[p.categoria || "Sem categoria"] = (catMap[p.categoria || "Sem categoria"] || 0) + Number(p.valor); });
      const gastosPorCategoria = Object.entries(catMap).map(([categoria, total]) => ({ categoria, total })).sort((a, b) => b.total - a.total).slice(0, 5);

      const resumo = calcularResumoCompras((comprasRes.data ?? []) as never);

      const comRows = (comissoesRes.data ?? []) as { valor: number; pago: boolean }[];
      const comissoesPagas = comRows.filter(x => x.pago).reduce((s, x) => s + Number(x.valor), 0);
      // Pendente reflete apenas comissões existentes (não excluídas) — exclusão reduz imediatamente.
      const comissoesPendentes = comRows.filter(x => !x.pago).reduce((s, x) => s + Number(x.valor), 0);

      const pRows = (pendentesRes.data ?? []) as unknown as { valor: number; data_vencimento: string | null }[];
      const todayStr = todayLocalISO();
      // Alinhado com a página Contas a Pagar:
      // total = soma de lançamentos pendentes do fluxo + valor TOTAL de todas as compras ativas
      const comprasAtivas = ((comprasRes.data ?? []) as any[]).filter(c => c.status_entrega !== "Cancelado");
      const fluxoPendenteTotal = pRows.reduce((s, r) => s + Number(r.valor), 0);
      const comprasValorTotal = comprasAtivas.reduce((s, c) => s + Number(c.valor_total || 0), 0);
      // Vencidas continuam baseadas em parcelas com data de vencimento real
      const parcelasVirtuais = flattenParcelasPendentes((comprasRes.data ?? []) as unknown as CompraComParcelas[]);
      const combinadasParaVenc = [
        ...pRows,
        ...parcelasVirtuais.map(p => ({ valor: p.valor, data_vencimento: p.data_vencimento })),
      ];
      const contasPagar = {
        total: fluxoPendenteTotal + comprasValorTotal,
        count: pRows.length + comprasAtivas.length,
        vencidas: combinadasParaVenc.filter(r => r.data_vencimento && r.data_vencimento < todayStr).length,
      };

      return {
        config,
        allTransForContas: rows,
        totalGasto,
        totalEntradas,
        gastosPorCategoria,
        transacoes: (recentTransRes.data as unknown as TransacaoRow[]) ?? [],
        comprasTotal: resumo.totalCompromissado,
        comprasAPagar: resumo.totalAPagar,
        comprasPendentes: resumo.pendentesEntrega,
        comissoesPagas,
        comissoesPendentes,
        contas: (contasRes.data as ContaRow[]) ?? [],
        contasPagar,
      };
    },
  });

  const config = dash?.config ?? CONFIG_DEFAULT;
  const totalGasto = dash?.totalGasto ?? 0;
  const totalEntradas = dash?.totalEntradas ?? 0;
  const transacoes = dash?.transacoes ?? [];
  const comprasPendentes = dash?.comprasPendentes ?? 0;
  const comprasTotal = dash?.comprasTotal ?? 0;
  const comprasAPagar = dash?.comprasAPagar ?? 0;
  const comissoesPendentes = dash?.comissoesPendentes ?? 0;
  const contas = dash?.contas ?? [];
  const allTransForContas = dash?.allTransForContas ?? [];
  const gastosPorCategoria = dash?.gastosPorCategoria ?? [];
  const contasPagar = dash?.contasPagar ?? { total: 0, count: 0, vencidas: 0 };

  const fetchData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["dashboard", user?.id] });
  }, [queryClient, user?.id]);

  useEffect(() => {
    if (isError) console.error("DashboardPage: erro ao carregar dados");
  }, [isError]);

  // Re-fetch when tab/window regains focus (realtime cobre o resto).
  useEffect(() => {
    const onFocus = () => fetchData();
    window.addEventListener("focus", onFocus);
    return () => { window.removeEventListener("focus", onFocus); };
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
      <DashboardHeader config={config} />

      {/* Alerts */}
      <DashboardAlerts alerts={alerts} />

      {/* Atalho Leitor IA */}
      <LeitorIACard />

      {/* Main KPIs + nota Ajuste de saldo */}
      <MainKpis
        orcamentoTotal={orcamentoTotal}
        totalGasto={totalGasto}
        saldo={saldo}
        totalEntradas={totalEntradas}
        percentual={percentual}
      />

      {/* Custo/m² + Contas a Pagar — destaque */}
      <CustoContasPagar
        custoM2={kpis.custoM2}
        areaConstruida={config.area_construida}
        contasPagar={contasPagar}
      />

      {/* Compras, Comissões, Contas row */}
      <ResumoCards
        comprasAPagar={comprasAPagar}
        comprasPendentes={comprasPendentes}
        comprasTotal={comprasTotal}
        comissoesPendentes={comissoesPendentes}
        contas={contas}
        allTransForContas={allTransForContas}
      />

      {/* Budget Progress */}
      <BudgetProgress percentual={percentual} />

      {/* Charts Row (lazy — below the fold) */}
      {(gastosPorCategoria.length > 0 || orcamentoTotal > 0) && (
        <Suspense fallback={<div className="glass-card p-5 h-64 animate-pulse" />}>
          <DashboardCharts
            orcamentoTotal={orcamentoTotal}
            totalGasto={totalGasto}
            gastosPorCategoria={gastosPorCategoria}
          />
        </Suspense>
      )}

      {/* Recent transactions */}
      <RecentTransactions
        transacoes={transacoes}
        onSelect={(t) => { setSelectedTransacao(t); setDrawerOpen(true); }}
      />

      <TransacaoDetailDrawer
        transacao={selectedTransacao}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onUpdated={fetchData}
      />
    </div>
  );
}
