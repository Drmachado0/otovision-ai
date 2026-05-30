import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/lib/formatters";

interface DashboardChartsProps {
  orcamentoTotal: number;
  totalGasto: number;
  gastosPorCategoria: { categoria: string; total: number }[];
}

/**
 * Chart section of the Dashboard, extracted so it can be React.lazy()'d.
 * These charts live below the fold (after KPIs, alerts and the budget
 * progress bar), so deferring the heavy `vendor-charts` chunk lets the page
 * shell render first.
 */
export default function DashboardCharts({ orcamentoTotal, totalGasto, gastosPorCategoria }: DashboardChartsProps) {
  return (
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
                <RTooltip
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
                <RTooltip
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
  );
}
