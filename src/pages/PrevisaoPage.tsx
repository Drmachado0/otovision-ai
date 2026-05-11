import { useCallback, useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import {
  AlertTriangle,
  Sliders,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TransRow { tipo: string; valor: number; categoria: string; data: string; }

export default function PrevisaoPage() {
  const [orcamento, setOrcamento] = useState(0);
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataTermino, setDataTermino] = useState<string>("");
  const [transacoes, setTransacoes] = useState<TransRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [ajustePercent, setAjustePercent] = useState(0);

  const fetchData = useCallback(async () => {
    const [configRes, transRes] = await Promise.all([
      supabase.from("obra_config").select("orcamento_total, data_inicio, data_termino").limit(1).maybeSingle(),
      supabase.from("obra_transacoes_fluxo").select("tipo, valor, categoria, data").is("deleted_at", null),
    ]);
    if (configRes.data) {
      setOrcamento(Number(configRes.data.orcamento_total) || 0);
      setDataInicio(configRes.data.data_inicio || "");
      setDataTermino(configRes.data.data_termino || "");
    }
    if (transRes.data) setTransacoes(transRes.data as TransRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeSubscription("obra_transacoes_fluxo", fetchData);

  const analysis = useMemo(() => {
    const totalGasto = transacoes.filter(t => t.tipo === "Saída").reduce((s, t) => s + Number(t.valor), 0);

    // Projeção baseada em burn rate e prazo da obra
    const inicio = dataInicio ? new Date(dataInicio).getTime() : 0;
    const fim = dataTermino ? new Date(dataTermino).getTime() : 0;
    const agora = Date.now();
    const diasDecorridos = inicio ? Math.max(1, Math.floor((agora - inicio) / 86400000)) : 1;
    const diasRestantes = fim ? Math.max(0, Math.floor((fim - agora) / 86400000)) : 0;
    const burnRate = totalGasto / diasDecorridos;
    const projecaoCusto = totalGasto + burnRate * diasRestantes;
    const projecaoComAjuste = projecaoCusto * (1 + ajustePercent / 100);
    const diferencaProjecao = projecaoComAjuste - orcamento;
    const percentualExecutado = orcamento > 0 ? (totalGasto / orcamento) * 100 : 0;
    const risco = projecaoComAjuste > orcamento * 1.1 ? "alto" : projecaoComAjuste > orcamento ? "medio" : "baixo";

    // Gastos por categoria
    const porCategoria: Record<string, { gasto: number }> = {};
    transacoes.filter(t => t.tipo === "Saída").forEach(t => {
      const cat = t.categoria || "Outros";
      if (!porCategoria[cat]) porCategoria[cat] = { gasto: 0 };
      porCategoria[cat].gasto += Number(t.valor);
    });
    const categorias = Object.entries(porCategoria)
      .map(([nome, v]) => ({ nome, gasto: v.gasto }))
      .sort((a, b) => b.gasto - a.gasto)
      .slice(0, 8);

    return {
      totalGasto, burnRate, diasRestantes,
      projecaoCusto: projecaoComAjuste, diferencaProjecao, percentualExecutado,
      risco, categorias,
    };
  }, [transacoes, orcamento, ajustePercent, dataInicio, dataTermino]);

  const riscoConfig = {
    baixo: { label: "Baixo", color: "text-success", bg: "bg-success/10", border: "border-success/20" },
    medio: { label: "Médio", color: "text-warning", bg: "bg-warning/10", border: "border-warning/20" },
    alto: { label: "Alto", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-slide-in">
        <div className="h-7 w-52 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass-card p-5 h-28 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const rc = riscoConfig[analysis.risco as keyof typeof riscoConfig];

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold">Previsão Financeira</h1>
        <p className="text-sm text-muted-foreground">Projeções e análise de tendências da obra</p>
      </div>

      {/* Alerta de risco */}
      {analysis.risco !== "baixo" && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${rc.bg} border ${rc.border} ${rc.color} text-sm font-medium`}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {analysis.risco === "alto"
            ? `🚨 Projeção de custo final (${formatCurrency(analysis.projecaoCusto)}) ULTRAPASSA o orçamento em ${formatCurrency(analysis.diferencaProjecao)}!`
            : `⚠️ Projeção próxima do limite do orçamento`}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="stat-card-info p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Orçamento</p>
          <p className="text-xl font-bold mt-1">{formatCurrency(orcamento)}</p>
        </div>
        <div className="stat-card-danger p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Gasto Atual</p>
          <p className="text-xl font-bold mt-1">{formatCurrency(analysis.totalGasto)}</p>
          <p className="text-xs text-muted-foreground mt-1">{formatPercent(analysis.percentualExecutado)} executado</p>
        </div>
        <div className={`glass-card p-5 relative overflow-hidden`}>
          <div className={`absolute top-0 left-0 w-1 h-full ${analysis.risco === "baixo" ? "bg-success" : analysis.risco === "medio" ? "bg-warning" : "bg-destructive"}`} />
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Projeção Final</p>
          <p className="text-xl font-bold mt-1">{formatCurrency(analysis.projecaoCusto)}</p>
          <p className={`text-xs mt-1 ${rc.color}`}>Risco {rc.label}</p>
        </div>
        <div className="stat-card-success p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Burn Rate / dia</p>
          <p className="text-xl font-bold mt-1">{formatCurrency(analysis.burnRate)}</p>
          <p className="text-xs text-muted-foreground mt-1">~{analysis.diasRestantes} dias até término</p>
        </div>
      </div>

      {/* Simulador */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sliders className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Simulador de Cenários</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <Label>Ajuste de Projeção (%)</Label>
            <Input
              type="number"
              value={ajustePercent}
              onChange={e => setAjustePercent(Number(e.target.value))}
              placeholder="+10 para 10% acima"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Positivo = mais caro, Negativo = economia</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Custo Final Simulado</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(analysis.projecaoCusto)}</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Diferença vs Orçamento</p>
            <p className={`text-lg font-bold ${analysis.diferencaProjecao > 0 ? "text-destructive" : "text-success"}`}>
              {analysis.diferencaProjecao > 0 ? "+" : ""}{formatCurrency(analysis.diferencaProjecao)}
            </p>
          </div>
        </div>
      </div>

      {/* Top categorias */}
      {analysis.categorias.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-4">Gastos por Categoria</h2>
          <div className="space-y-2">
            {analysis.categorias.map((c, i) => {
              const pct = analysis.totalGasto > 0 ? (c.gasto / analysis.totalGasto) * 100 : 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-24 truncate" title={c.nome}>{c.nome}</span>
                  <div className="flex-1 h-2 rounded-full bg-secondary/50 overflow-hidden">
                    <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-medium w-20 text-right">{formatCurrency(c.gasto)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
