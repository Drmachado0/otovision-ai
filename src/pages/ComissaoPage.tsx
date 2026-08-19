import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { formatCurrency, formatMes, todayLocalISO } from "@/lib/formatters";
import { Download, FileText, Scale } from "lucide-react";
import { printAcertoConstrutorReport, type AcertoMes } from "@/lib/pdfGenerator";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import ComissaoDetailDrawer, { parseObservacoes } from "@/components/ComissaoDetailDrawer";
import AjusteComissaoDialog from "@/components/AjusteComissaoDialog";
import { ComissaoKpis } from "./comissao/ComissaoKpis";
import { ResumoMensal } from "./comissao/ResumoMensal";
import { DetalhamentoPagamentos } from "./comissao/DetalhamentoPagamentos";
import {
  PERCENTUAL_COMISSAO,
  type ComissaoRow,
  type TransacaoRow,
  type SortField,
  type SortDir,
} from "./comissao/types";

// Charts sit below the fold — lazy-load so the `vendor-charts` chunk doesn't
// block the KPIs, list and filters from rendering.
const ComissaoCharts = lazy(() => import("@/components/charts/ComissaoCharts"));

export default function ComissaoPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ComissaoRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Filters
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "pago" | "pendente">("todos");
  const [filtroMes, setFiltroMes] = useState<string>("todos");
  const [filtroOrigem, setFiltroOrigem] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const debouncedBusca = useDebounce(busca, 300);
  const [sortField, setSortField] = useState<SortField>("data");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkPay, setConfirmBulkPay] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Monthly accordion
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const [deleteTarget, setDeleteTarget] = useState<ComissaoRow | null>(null);
  const [ajusteOpen, setAjusteOpen] = useState(false);

  const { data, isLoading: loading, isError } = useQuery({
    queryKey: ["comissao", user?.id],
    enabled: !!user,
    queryFn: async () => {
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
      if (transRes.error) throw transRes.error;
      if (comRes.error) throw comRes.error;
      return {
        transacoes: (transRes.data as TransacaoRow[]) ?? [],
        comissoes: (comRes.data as ComissaoRow[]) ?? [],
      };
    },
  });

  const transacoes = data?.transacoes ?? [];
  const comissoes = data?.comissoes ?? [];

  const fetchData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["comissao", user?.id] });
  }, [queryClient, user?.id]);

  useEffect(() => {
    if (isError) toast.error("Erro ao carregar dados. Tentando novamente...");
  }, [isError]);

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
      porMes, mesesOrdenados, serieMensal, gastosPorMes,
      mediaMensal, mesMaior, mesMenor, ticketMedio,
      valorMesAtual, valorMesAnterior, variacaoMes,
      previsaoProx, topFornecedores, pendentesAtrasados, donut,
    };
  }, [transacoes, comissoes]);

  // ===== FILTRAGEM DA LISTA =====
  const filtered = useMemo(() => {
    const buscaLower = debouncedBusca.trim().toLowerCase();
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
  }, [comissoes, filtroStatus, filtroMes, filtroOrigem, debouncedBusca, sortField, sortDir]);

  const handleQuickDelete = useCallback((c: ComissaoRow) => setDeleteTarget(c), []);
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

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

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

  const gerarRelatorioAcerto = (apenasPendentes: boolean) => {
    const baseList = filtered.length ? filtered : comissoes;
    const lista = apenasPendentes ? baseList.filter((c) => !c.pago) : baseList;
    if (!lista.length) {
      toast.error(apenasPendentes ? "Nenhuma comissão pendente" : "Nenhum lançamento para gerar relatório");
      return;
    }
    // Agrupa por mês de referência
    const grupos = new Map<string, AcertoMes>();
    for (const c of lista) {
      const mes = c.mes || (c.created_at || "").slice(0, 7) || "—";
      if (!grupos.has(mes)) {
        grupos.set(mes, {
          mes,
          mesLabel: mes === "—" ? "Sem mês" : formatMes(mes),
          gastosMes: agg.porMes[mes]?.gastosMes || 0,
          comissaoMes: 0, pagoMes: 0, pendenteMes: 0,
          itens: [],
        });
      }
      const g = grupos.get(mes)!;
      const valor = Number(c.valor);
      const valorBase = valor / (PERCENTUAL_COMISSAO / 100);
      const parsed = parseObservacoes(c.observacoes);
      g.comissaoMes += valor;
      if (c.pago) g.pagoMes += valor; else g.pendenteMes += valor;
      g.itens.push({
        data: c.data_pagamento || c.created_at,
        fornecedor: c.fornecedor || parsed.fornecedor || "—",
        categoria: c.categoria || "—",
        origem: parsed.tipo || "Manual",
        valorBase,
        comissao: valor,
        pago: c.pago,
      });
    }
    const meses = Array.from(grupos.values()).sort((a, b) => a.mes.localeCompare(b.mes));
    const totalGastoPeriodo = meses.reduce((s, m) => s + m.gastosMes, 0);
    const comissaoTotal = meses.reduce((s, m) => s + m.comissaoMes, 0);
    const comissaoPaga = meses.reduce((s, m) => s + m.pagoMes, 0);
    const comissaoPendente = meses.reduce((s, m) => s + m.pendenteMes, 0);

    const periodoLabel = apenasPendentes
      ? `Acerto de pendências · ${meses[0].mesLabel}${meses.length > 1 ? ` a ${meses[meses.length - 1].mesLabel}` : ""}`
      : `Período: ${meses[0].mesLabel}${meses.length > 1 ? ` a ${meses[meses.length - 1].mesLabel}` : ""}`;

    printAcertoConstrutorReport({
      nomeObra: "Obra",
      percentual: PERCENTUAL_COMISSAO,
      periodoLabel,
      totalGasto: totalGastoPeriodo || agg.totalGasto,
      comissaoTotal,
      comissaoPaga,
      comissaoPendente,
      meses,
    });
    toast.success("Relatório gerado — pronto para imprimir/PDF");
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

  const openDetail = useCallback((c: ComissaoRow) => {
    setSelected(c);
    setDrawerOpen(true);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const mesesParaFiltro = [...agg.mesesOrdenados].reverse();

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
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setAjusteOpen(true)}
            className="px-3 py-2 rounded-lg bg-secondary/60 hover:bg-secondary text-secondary-foreground text-sm font-medium flex items-center gap-2 transition-colors border border-border"
            title="Ajustar comissão manualmente: novo lançamento, corrigir valor ou acerto do mês"
          >
            <Scale className="w-4 h-4" /> Ajuste de comissão
          </button>
          <button
            onClick={() => gerarRelatorioAcerto(true)}
            className="px-3 py-2 rounded-lg bg-warning/15 hover:bg-warning/25 text-warning text-sm font-medium flex items-center gap-2 transition-colors border border-warning/30"
            title="Gera relatório PDF apenas com as comissões pendentes do filtro atual"
          >
            <FileText className="w-4 h-4" /> Acerto (pendentes)
          </button>
          <button
            onClick={() => gerarRelatorioAcerto(false)}
            className="px-3 py-2 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary text-sm font-medium flex items-center gap-2 transition-colors border border-primary/30"
            title="Gera relatório PDF completo do período filtrado para acerto com o construtor"
          >
            <FileText className="w-4 h-4" /> Relatório completo
          </button>
          <button
            onClick={exportCSV}
            className="px-3 py-2 rounded-lg bg-accent/50 hover:bg-accent text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
      </div>

      {/* KPIs principais + secundários + progress bar de quitação */}
      <ComissaoKpis agg={agg} comissoes={comissoes} />

      {/* Gráficos (lazy — abaixo da dobra) */}
      <Suspense fallback={<div className="glass-card p-5 h-72 animate-pulse" />}>
        <ComissaoCharts
          serieMensal={agg.serieMensal}
          comissaoTotal={agg.comissaoTotal}
          donut={agg.donut}
          topFornecedores={agg.topFornecedores}
        />
      </Suspense>

      {/* Resumo Mensal (accordion) */}
      <ResumoMensal
        serieMensal={agg.serieMensal}
        comissoes={comissoes}
        expandedMonths={expandedMonths}
        onToggleMonth={toggleMonth}
        onSelect={openDetail}
      />

      {/* Detalhamento + filtros */}
      <DetalhamentoPagamentos
        filtered={filtered}
        selectedIds={selectedIds}
        selectedPendentesCount={selectedPendentes.length}
        mesesParaFiltro={mesesParaFiltro}
        busca={busca}
        onBuscaChange={setBusca}
        filtroMes={filtroMes}
        onFiltroMesChange={setFiltroMes}
        filtroOrigem={filtroOrigem}
        onFiltroOrigemChange={setFiltroOrigem}
        filtroStatus={filtroStatus}
        onFiltroStatusChange={setFiltroStatus}
        sortField={sortField}
        sortDir={sortDir}
        onToggleSort={toggleSort}
        onBulkPay={() => setConfirmBulkPay(true)}
        onToggleSelect={toggleSelect}
        onSelect={openDetail}
        onQuickDelete={handleQuickDelete}
      />

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

      <AjusteComissaoDialog
        open={ajusteOpen}
        onOpenChange={setAjusteOpen}
        onUpdate={fetchData}
        comissoes={comissoes}
        gastosPorMes={agg.gastosPorMes}
        mesesDisponiveis={mesesParaFiltro}
      />
    </div>
  );
}
