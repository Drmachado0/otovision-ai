import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown, TrendingUp, Percent } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(160,60%,45%)", "hsl(200,70%,50%)", "hsl(38,92%,50%)", "hsl(280,60%,50%)", "hsl(0,72%,51%)", "hsl(120,40%,45%)"];

interface SummaryData {
  orcamento: number;
  gasto: number;
  saldo: number;
  percentual: number;
  porCategoria: { name: string; value: number }[];
  porMes: { mes: string; valor: number }[];
}

export default function Dashboard() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: config } = await supabase.from("obra_config").select("orcamento_total").limit(1).single();
        
        const { data: transacoes } = await supabase
          .from("obra_transacoes_fluxo")
          .select("tipo, valor, categoria, data")
          .is("deleted_at", null);

        const orcamento = config?.orcamento_total ?? 0;
        let totalSaidas = 0;
        let totalEntradas = 0;
        const catMap: Record<string, number> = {};
        const mesMap: Record<string, number> = {};

        (transacoes ?? []).forEach((t) => {
          const val = Number(t.valor) || 0;
          if (t.tipo === "Saída") {
            totalSaidas += val;
            const cat = t.categoria || "Outros";
            catMap[cat] = (catMap[cat] || 0) + val;
          } else {
            totalEntradas += val;
          }
          const mes = t.data ? t.data.substring(0, 7) : "N/A";
          if (t.tipo === "Saída") {
            mesMap[mes] = (mesMap[mes] || 0) + val;
          }
        });

        const gasto = totalSaidas;
        const saldo = orcamento - gasto + totalEntradas;
        const percentual = orcamento > 0 ? (gasto / orcamento) * 100 : 0;

        const porCategoria = Object.entries(catMap)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6);

        const porMes = Object.entries(mesMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6)
          .map(([mes, valor]) => ({ mes, valor }));

        setData({ orcamento, gasto, saldo, percentual, porCategoria, porMes });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="glass-card animate-pulse h-32" />
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    { title: "Orçamento Total", value: fmt(data?.orcamento ?? 0), icon: DollarSign, color: "text-primary" },
    { title: "Total Gasto", value: fmt(data?.gasto ?? 0), icon: TrendingDown, color: "text-destructive" },
    { title: "Saldo Disponível", value: fmt(data?.saldo ?? 0), icon: TrendingUp, color: "text-primary" },
    { title: "% Executado", value: `${(data?.percentual ?? 0).toFixed(1)}%`, icon: Percent, color: "hsl(var(--warning))" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.title} className="glass-card glow-primary/20 hover:border-primary/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Gastos por Mês</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.porMes ?? []}>
                <XAxis dataKey="mes" tick={{ fill: "hsl(215,15%,55%)", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(215,15%,55%)", fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(220,18%,10%)", border: "1px solid hsl(220,15%,18%)", borderRadius: "8px" }}
                  labelStyle={{ color: "hsl(210,20%,95%)" }}
                  formatter={(value: number) => [fmt(value), "Gasto"]}
                />
                <Bar dataKey="valor" fill="hsl(160,60%,45%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Gastos por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.porCategoria ?? []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {(data?.porCategoria ?? []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(220,18%,10%)", border: "1px solid hsl(220,15%,18%)", borderRadius: "8px" }}
                  formatter={(value: number) => [fmt(value)]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
