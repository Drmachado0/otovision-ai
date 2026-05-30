import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, AreaChart, Area, PieChart, Pie, Cell,
  BarChart,
} from "recharts";
import { formatCurrency } from "@/lib/formatters";

interface SerieMensal {
  mes: string;
  mesLabel: string;
  pago: number;
  pendente: number;
  total: number;
  teorica: number;
  count: number;
  acumPago: number;
  acumTotal: number;
}

interface ComissaoChartsProps {
  serieMensal: SerieMensal[];
  comissaoTotal: number;
  donut: { name: string; value: number }[];
  topFornecedores: { nome: string; valor: number }[];
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

const PIE_COLORS = ["hsl(var(--success))", "hsl(var(--warning))"];

/**
 * Chart section of the Comissão page, extracted so it can be React.lazy()'d.
 * These charts sit below the fold (after KPIs, secondary KPIs and the
 * quitação progress bar), so deferring the `vendor-charts` chunk lets the
 * page shell paint first.
 */
export default function ComissaoCharts({ serieMensal, comissaoTotal, donut, topFornecedores }: ComissaoChartsProps) {
  return (
    <>
      {/* Gráfico A: Comissão mês a mês */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold mb-4">Comissão mês a mês</h2>
        {serieMensal.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados para exibir</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={serieMensal} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
        {serieMensal.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados para exibir</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={serieMensal} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
          {comissaoTotal === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={donut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {donut.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-4">Top 5 fornecedores (geradores de comissão)</h2>
          {topFornecedores.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topFornecedores} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
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
    </>
  );
}
