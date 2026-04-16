import { useCallback, useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Package,
} from "lucide-react";
import {
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface TransacaoSaida {
  tipo: string;
  valor: number;
  categoria: string;
  descricao: string;
}

interface CategoriaABC {
  rank: number;
  categoria: string;
  valorTotal: number;
  percentual: number;
  percentualAcumulado: number;
  classe: "A" | "B" | "C";
}

const COLORS = {
  A: "hsl(165 82% 51%)",
  B: "hsl(38 92% 50%)",
  C: "hsl(215 20% 55%)",
};

const BADGE_CLASS = {
  A: "badge-success",
  B: "badge-warning",
  C: "badge-muted",
};

const tooltipStyle = {
  background: "hsl(222 47% 9%)",
  border: "1px solid hsl(222 30% 16%)",
  borderRadius: "8px",
  fontSize: "12px",
};

export default function CurvaABCPage() {
  const [transacoes, setTransacoes] = useState<TransacaoSaida[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from("obra_transacoes_fluxo")
      .select("tipo, valor, categoria, descricao")
      .eq("tipo", "Saída")
      .is("deleted_at", null);
    if (data) setTransacoes(data.map(d => ({ ...d, descricao: d.descricao || "" })));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  useRealtimeSubscription("obra_transacoes_fluxo", fetchData);

  const abcData = useMemo((): CategoriaABC[] => {
    const porCategoria: Record<string, number> = {};
    transacoes.forEach((t) => {
      const cat = t.categoria || "Outros";
      porCategoria[cat] = (porCategoria[cat] || 0) + Number(t.valor);
    });

    const sorted = Object.entries(porCategoria)
      .map(([categoria, valorTotal]) => ({ categoria, valorTotal }))
      .sort((a, b) => b.valorTotal - a.valorTotal);

    const totalGeral = sorted.reduce((s, c) => s + c.valorTotal, 0);
    if (totalGeral === 0) return [];

    let acumulado = 0;
    return sorted.map((item, i) => {
      const percentual = (item.valorTotal / totalGeral) * 100;
      acumulado += percentual;
      const classe: "A" | "B" | "C" =
        acumulado <= 80 ? "A" : acumulado <= 95 ? "B" : "C";
      return {
        rank: i + 1,
        categoria: item.categoria,
        valorTotal: item.valorTotal,
        percentual,
        percentualAcumulado: acumulado,
        classe,
      };
    });
  }, [transacoes]);

  const totalGasto = useMemo(
    () => abcData.reduce((s, c) => s + c.valorTotal, 0),
    [abcData]
  );
  const countA = useMemo(() => abcData.filter((c) => c.classe === "A").length, [abcData]);
  const countB = useMemo(() => abcData.filter((c) => c.classe === "B").length, [abcData]);
  const countC = useMemo(() => abcData.filter((c) => c.classe === "C").length, [abcData]);

  const chartData = useMemo(
    () =>
      abcData.map((item) => ({
        categoria: item.categoria,
        valor: item.valorTotal,
        acumulado: item.percentualAcumulado,
        classe: item.classe,
        fill: COLORS[item.classe],
      })),
    [abcData]
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-slide-in">
        <div className="h-7 w-52 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass-card p-5 h-24 animate-pulse" />
          ))}
        </div>
        <div className="glass-card p-5 h-80 animate-pulse" />
        <div className="glass-card p-5 h-64 animate-pulse" />
      </div>
    );
  }

  if (abcData.length === 0) {
    return (
      <div className="space-y-6 animate-slide-in">
        <div className="page-header">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" /> Curva ABC
          </h1>
          <p className="text-sm text-muted-foreground">
            Análise de prioridade dos gastos por categoria
          </p>
        </div>
        <div className="glass-card p-12 text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Nenhuma transação de saída encontrada. Cadastre saídas para visualizar a Curva ABC.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header */}
      <div className="page-header">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" /> Curva ABC
        </h1>
        <p className="text-sm text-muted-foreground">
          Análise de prioridade dos gastos por categoria
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-fade-in-up">
        <div className="stat-card-info">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-info" />
            <span className="text-xs text-muted-foreground">Categorias</span>
          </div>
          <p className="text-2xl font-bold">{abcData.length}</p>
        </div>

        <div className="stat-card-primary">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total Gasto</span>
          </div>
          <p className="text-lg font-bold">{formatCurrency(totalGasto)}</p>
        </div>

        <div className="stat-card-success">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-success" />
            <span className="text-xs text-muted-foreground">Classe A</span>
          </div>
          <p className="text-2xl font-bold">
            {countA} <span className="text-xs font-normal text-muted-foreground">itens (80%)</span>
          </p>
        </div>

        <div className="stat-card-warning">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <span className="text-xs text-muted-foreground">Classe B</span>
          </div>
          <p className="text-2xl font-bold">
            {countB} <span className="text-xs font-normal text-muted-foreground">itens (15%)</span>
          </p>
        </div>

        <div className="stat-card-info">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Classe C</span>
          </div>
          <p className="text-2xl font-bold">
            {countC} <span className="text-xs font-normal text-muted-foreground">itens (5%)</span>
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card p-5 animate-fade-in-up">
        <h2 className="text-sm font-semibold mb-4">Pareto - Gastos por Categoria</h2>
        <ResponsiveContainer width="100%" height={380}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 16%)" />
            <XAxis
              dataKey="categoria"
              tick={{ fontSize: 11, fill: "hsl(215 20% 65%)" }}
              angle={-35}
              textAnchor="end"
              interval={0}
              height={60}
            />
            <YAxis
              yAxisId="valor"
              tick={{ fontSize: 11, fill: "hsl(215 20% 65%)" }}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
              }
            />
            <YAxis
              yAxisId="pct"
              orientation="right"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "hsl(215 20% 65%)" }}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number, name: string) => {
                if (name === "valor") return [formatCurrency(value), "Valor"];
                if (name === "acumulado") return [formatPercent(value), "Acumulado"];
                return [value, name];
              }}
              labelStyle={{ color: "hsl(215 20% 65%)", marginBottom: 4 }}
            />
            <Bar
              yAxisId="valor"
              dataKey="valor"
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
            <Area
              yAxisId="pct"
              dataKey="acumulado"
              fill="hsl(165 82% 51%)"
              fillOpacity={0.08}
              stroke="none"
            />
            <Line
              yAxisId="pct"
              dataKey="acumulado"
              stroke="hsl(165 82% 51%)"
              strokeWidth={2}
              dot={{ r: 3, fill: "hsl(165 82% 51%)" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="glass-card p-5 animate-fade-in-up">
        <h2 className="text-sm font-semibold mb-4">Detalhamento por Categoria</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground text-xs">
                <th className="text-left py-2 px-3">#</th>
                <th className="text-left py-2 px-3">Categoria</th>
                <th className="text-right py-2 px-3">Valor Total</th>
                <th className="text-right py-2 px-3">% do Total</th>
                <th className="text-right py-2 px-3">% Acumulado</th>
                <th className="text-center py-2 px-3">Classe</th>
              </tr>
            </thead>
            <tbody>
              {abcData.map((item) => (
                <tr
                  key={item.rank}
                  className="border-b border-border/20 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-2.5 px-3 text-muted-foreground">{item.rank}</td>
                  <td className="py-2.5 px-3 font-medium">{item.categoria}</td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {formatCurrency(item.valorTotal)}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {formatPercent(item.percentual)}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {formatPercent(item.percentualAcumulado)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE_CLASS[item.classe]}`}
                    >
                      {item.classe}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
