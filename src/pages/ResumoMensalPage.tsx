import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { formatCurrency } from "@/lib/formatters";
import {
  Calendar, TrendingUp, TrendingDown, DollarSign, BarChart3,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line,
} from "recharts";

interface MesData {
  mes: string;
  mesLabel: string;
  entradas: number;
  saidas: number;
  saldo: number;
  saldoAcumulado: number;
  topCategorias: { categoria: string; total: number }[];
}

const MESES_PT: Record<string, string> = {
  "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr",
  "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
};

export default function ResumoMensalPage() {
  const [meses, setMeses] = useState<MesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<"3" | "6" | "12" | "all">("6");

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from("obra_transacoes_fluxo")
      .select("tipo, valor, categoria, data")
      .is("deleted_at", null)
      .eq("status", "pago")
      .order("data", { ascending: true });

    if (!data) { setLoading(false); return; }

    // Group by month
    const porMes: Record<string, { entradas: number; saidas: number; categorias: Record<string, number> }> = {};
    for (const t of data as { tipo: string; valor: number; categoria: string; data: string }[]) {
      const mes = t.data?.slice(0, 7); // YYYY-MM
      if (!mes) continue;
      if (!porMes[mes]) porMes[mes] = { entradas: 0, saidas: 0, categorias: {} };
      const val = Number(t.valor);
      if (t.tipo === "Entrada") porMes[mes].entradas += val;
      else {
        porMes[mes].saidas += val;
        porMes[mes].categorias[t.categoria || "Outro"] = (porMes[mes].categorias[t.categoria || "Outro"] || 0) + val;
      }
    }

    // Sort and limit by periodo
    const sorted = Object.entries(porMes).sort((a, b) => a[0].localeCompare(b[0]));
    const limited = periodo === "all" ? sorted : sorted.slice(-parseInt(periodo));

    let acumulado = 0;
    // Calculate accumulated balance from all months before the limited window
    if (periodo !== "all") {
      const before = sorted.slice(0, sorted.length - limited.length);
      for (const [, m] of before) acumulado += m.entradas - m.saidas;
    }

    const result: MesData[] = limited.map(([mes, m]) => {
      const saldo = m.entradas - m.saidas;
      acumulado += saldo;
      const parts = mes.split("-");
      const topCat = Object.entries(m.categorias)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([categoria, total]) => ({ categoria, total }));
      return {
        mes,
        mesLabel: `${MESES_PT[parts[1]] || parts[1]}/${parts[0].slice(2)}`,
        entradas: m.entradas,
        saidas: m.saidas,
        saldo,
        saldoAcumulado: acumulado,
        topCategorias: topCat,
      };
    });

    setMeses(result);
    setLoading(false);
  }, [periodo]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeSubscription("obra_transacoes_fluxo", fetchData);

  const totalEntradas = meses.reduce((s, m) => s + m.entradas, 0);
  const totalSaidas = meses.reduce((s, m) => s + m.saidas, 0);
  const saldoFinal = meses.length > 0 ? meses[meses.length - 1].saldoAcumulado : 0;
  const mediaMensal = meses.length > 0 ? totalSaidas / meses.length : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="text-2xl font-bold">Resumo Mensal</h1>
          <p className="text-sm text-muted-foreground">Historico financeiro por periodo</p>
        </div>
        <div className="flex gap-1">
          {(["3", "6", "12", "all"] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                periodo === p ? "bg-primary text-primary-foreground" : "bg-accent/50 text-muted-foreground hover:bg-accent"
              }`}
            >
              {p === "all" ? "Tudo" : `${p}m`}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { cls: "stat-card-success", icon: <ArrowUpRight className="w-4 h-4 text-success" />, label: "Total Entradas", value: formatCurrency(totalEntradas), color: "text-success" },
          { cls: "stat-card-danger", icon: <ArrowDownRight className="w-4 h-4 text-destructive" />, label: "Total Saidas", value: formatCurrency(totalSaidas), color: "text-destructive" },
          { cls: "stat-card-info", icon: <DollarSign className="w-4 h-4 text-info" />, label: "Saldo Acumulado", value: formatCurrency(saldoFinal), color: saldoFinal >= 0 ? "text-success" : "text-destructive" },
          { cls: "stat-card-warning", icon: <BarChart3 className="w-4 h-4 text-warning" />, label: "Media Mensal (Saidas)", value: formatCurrency(mediaMensal) },
        ].map((c, i) => (
          <div key={c.label} className={`${c.cls} p-4 animate-fade-in-up`} style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center gap-2 mb-2">{c.icon}<span className="text-xs text-muted-foreground uppercase">{c.label}</span></div>
            <p className={`text-lg font-bold ${c.color || ""}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Bar Chart - Entradas vs Saídas */}
      {meses.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-4">Entradas vs Saidas por Mes</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={meses} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 16%)" />
                <XAxis dataKey="mesLabel" tick={{ fontSize: 11, fill: "hsl(215 20% 55%)" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(215 20% 55%)" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(222 47% 9%)", border: "1px solid hsl(222 30% 16%)", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="entradas" name="Entradas" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saidas" name="Saidas" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Line Chart - Saldo Acumulado */}
      {meses.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-4">Saldo Acumulado</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={meses} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 16%)" />
                <XAxis dataKey="mesLabel" tick={{ fontSize: 11, fill: "hsl(215 20% 55%)" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(215 20% 55%)" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(222 47% 9%)", border: "1px solid hsl(222 30% 16%)", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Line type="monotone" dataKey="saldoAcumulado" name="Saldo" stroke="hsl(165 82% 51%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Monthly Detail Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h2 className="text-sm font-semibold">Detalhamento Mensal</h2>
        </div>
        {meses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado no periodo</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Mes</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Entradas</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Saidas</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Saldo</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Acumulado</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Top Categorias</th>
              </tr>
            </thead>
            <tbody>
              {meses.map((m, i) => (
                <tr key={m.mes} className="border-b border-border/30 hover:bg-accent/30 animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
                  <td className="px-4 py-3 font-medium flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    {m.mesLabel}
                  </td>
                  <td className="px-4 py-3 text-right text-success">{formatCurrency(m.entradas)}</td>
                  <td className="px-4 py-3 text-right text-destructive">{formatCurrency(m.saidas)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${m.saldo >= 0 ? "text-success" : "text-destructive"}`}>
                    {m.saldo >= 0 ? "+" : ""}{formatCurrency(m.saldo)}
                  </td>
                  <td className={`px-4 py-3 text-right font-bold ${m.saldoAcumulado >= 0 ? "text-success" : "text-destructive"}`}>
                    {formatCurrency(m.saldoAcumulado)}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {m.topCategorias.map(c => (
                        <span key={c.categoria} className="badge-muted text-[9px]">{c.categoria}: {formatCurrency(c.total)}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
