import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MesAgg } from "@/lib/folhaMaoObra";
import { formatCurrency } from "@/lib/formatters";

interface Props {
  data: MesAgg[];
}

export default function MaoObraHistoricoChart({ data }: Props) {
  return (
    <div className="glass-card p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Despesas mês a mês</h3>
        <p className="text-xs text-muted-foreground">
          Diárias + encargos (FGTS / INSS) — últimos 12 meses
        </p>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
              }
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number) => formatCurrency(Number(v))}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="diarias" name="Diárias" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
            <Bar dataKey="fgts" name="FGTS" stackId="a" fill="hsl(var(--warning))" />
            <Bar dataKey="inss" name="INSS" stackId="a" fill="hsl(var(--info))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
