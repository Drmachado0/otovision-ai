import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line,
} from "recharts";
import { formatCurrency } from "@/lib/formatters";

interface MesData {
  mes: string;
  mesLabel: string;
  entradas: number;
  saidas: number;
  saldo: number;
  saldoAcumulado: number;
  topCategorias: { categoria: string; total: number }[];
}

export default function ResumoMensalCharts({ meses }: { meses: MesData[] }) {
  return (
    <>
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
    </>
  );
}
