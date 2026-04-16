import { useCallback, useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { formatCurrency, formatDate, formatPercent } from "@/lib/formatters";
import { toast } from "sonner";
import {
  Plus,
  ClipboardList,
  TrendingUp,
  DollarSign,
  ChevronDown,
  ChevronUp,
  BarChart3,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface MedicaoItem {
  etapa: string;
  percentual: number;
  valor: number;
}

interface Medicao {
  id: string;
  user_id: string;
  data: string;
  descricao: string;
  percentual_geral: number;
  valor_total_medido: number;
  itens: MedicaoItem[];
  observacoes: string;
  created_at: string;
  updated_at: string;
}

interface EtapaCronograma {
  nome: string;
  custo_previsto: number;
  percentual_conclusao: number;
}

interface FormItem {
  etapa: string;
  percentual: number;
  valor: number;
}

const emptyForm = {
  data: "",
  descricao: "",
  observacoes: "",
};

export default function MedicaoObraPage() {
  const { session } = useAuth();
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [etapas, setEtapas] = useState<EtapaCronograma[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formItens, setFormItens] = useState<FormItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [medRes, etaRes] = await Promise.all([
      supabase
        .from("obra_medicoes")
        .select("*")
        .order("data", { ascending: false }),
      supabase
        .from("obra_cronograma")
        .select("nome, custo_previsto, percentual_conclusao"),
    ]);
    if (medRes.data) {
      setMedicoes(
        (medRes.data as any[]).map((m) => ({
          ...m,
          itens: Array.isArray(m.itens) ? m.itens : [],
        })) as Medicao[]
      );
    }
    if (etaRes.data) setEtapas(etaRes.data as EtapaCronograma[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useRealtimeSubscription("obra_medicoes", fetchData);

  // KPI stats
  const stats = useMemo(() => {
    const total = medicoes.length;
    const percMedia =
      total > 0
        ? medicoes.reduce((s, m) => s + m.percentual_geral, 0) / total
        : 0;
    const valorTotal = medicoes.reduce((s, m) => s + m.valor_total_medido, 0);
    return { total, percMedia, valorTotal };
  }, [medicoes]);

  // Chart data
  const chartData = useMemo(() => {
    return [...medicoes]
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((m) => ({
        data: formatDate(m.data),
        percentual: m.percentual_geral,
      }));
  }, [medicoes]);

  // Auto-calculate totals from form items
  const formTotals = useMemo(() => {
    const percGeral =
      formItens.length > 0
        ? formItens.reduce((s, i) => s + i.percentual, 0) / formItens.length
        : 0;
    const valorTotal = formItens.reduce((s, i) => s + i.valor, 0);
    return { percGeral, valorTotal };
  }, [formItens]);

  const openNew = () => {
    setForm(emptyForm);
    setFormItens(
      etapas.map((e) => ({
        etapa: e.nome,
        percentual: e.percentual_conclusao ?? 0,
        valor: 0,
      }))
    );
    setDialogOpen(true);
  };

  const updateItem = (
    index: number,
    field: "percentual" | "valor",
    value: number
  ) => {
    setFormItens((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.data) {
      toast.error("Data é obrigatória");
      return;
    }
    if (!form.descricao.trim()) {
      toast.error("Descrição é obrigatória");
      return;
    }
    setSaving(true);

    const payload = {
      data: form.data,
      descricao: form.descricao,
      observacoes: form.observacoes,
      percentual_geral: Number(formTotals.percGeral.toFixed(2)),
      valor_total_medido: Number(formTotals.valorTotal.toFixed(2)),
      itens: formItens as any,
      user_id: session?.user?.id,
    };

    const { error } = await supabase
      .from("obra_medicoes")
      .insert(payload as any);

    if (error) {
      toast.error("Erro ao salvar medição");
    } else {
      toast.success("Medição registrada com sucesso");
      setDialogOpen(false);
      fetchData();
    }
    setSaving(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6 animate-slide-in">
        <div className="h-7 w-56 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card p-5 h-24 animate-pulse" />
          ))}
        </div>
        <div className="glass-card p-5 h-64 animate-pulse" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card p-5 h-28 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Medição de Obra</h1>
          <p className="text-sm text-muted-foreground">
            Registro e acompanhamento de medições
          </p>
        </div>
        <Button onClick={openNew} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Nova Medição
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up">
        <div className="stat-card-info p-4">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Total Medições
            </p>
          </div>
          <p className="text-xl font-bold">{stats.total}</p>
        </div>
        <div className="stat-card-success p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              % Geral Médio
            </p>
          </div>
          <p className="text-xl font-bold">{formatPercent(stats.percMedia)}</p>
        </div>
        <div className="stat-card-warning p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Valor Total Medido
            </p>
          </div>
          <p className="text-xl font-bold">
            {formatCurrency(stats.valorTotal)}
          </p>
        </div>
      </div>

      {/* Bar Chart */}
      {chartData.length > 0 && (
        <div className="glass-card p-5 animate-fade-in-up">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Evolução das Medições
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 16%)" />
              <XAxis
                dataKey="data"
                tick={{ fontSize: 11, fill: "hsl(215 20% 65%)" }}
                axisLine={{ stroke: "hsl(222 30% 16%)" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(215 20% 65%)" }}
                axisLine={{ stroke: "hsl(222 30% 16%)" }}
                domain={[0, 100]}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(222 47% 9%)",
                  border: "1px solid hsl(222 30% 16%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar
                dataKey="percentual"
                name="% Geral"
                fill="hsl(217 91% 60%)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Medicoes List */}
      {medicoes.length === 0 ? (
        <div className="glass-card p-10 text-center animate-fade-in-up">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Nenhuma medição registrada</p>
          <p className="text-xs text-muted-foreground mt-1">
            Clique em &quot;Nova Medição&quot; para começar
          </p>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in-up">
          {medicoes.map((m) => {
            const isExpanded = expandedId === m.id;
            return (
              <div key={m.id} className="glass-card p-5 transition-all">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleExpand(m.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-semibold truncate">
                        {m.descricao}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(m.data)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex-1 max-w-xs">
                        <Progress
                          value={m.percentual_geral}
                          className="h-2"
                        />
                      </div>
                      <span className="text-sm font-medium text-primary">
                        {formatPercent(m.percentual_geral)}
                      </span>
                      <span className="text-sm font-medium">
                        {formatCurrency(m.valor_total_medido)}
                      </span>
                    </div>
                  </div>
                  <div className="ml-3">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                    {m.itens.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                          Itens da Medição
                        </p>
                        {m.itens.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-sm bg-muted/20 rounded-lg px-3 py-2"
                          >
                            <span className="truncate flex-1">
                              {item.etapa}
                            </span>
                            <div className="flex items-center gap-4 ml-3">
                              <span className="text-muted-foreground">
                                {formatPercent(item.percentual)}
                              </span>
                              <span className="font-medium">
                                {formatCurrency(item.valor)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {m.observacoes && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                          Observações
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {m.observacoes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Medição</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="med-data">Data</Label>
                <Input
                  id="med-data"
                  type="date"
                  value={form.data}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, data: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="med-desc">Descrição</Label>
                <Input
                  id="med-desc"
                  placeholder="Ex: Medição Mês 03"
                  value={form.descricao}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, descricao: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Etapas items */}
            {formItens.length > 0 && (
              <div>
                <Label className="mb-2 block">Etapas</Label>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {formItens.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-muted/20 rounded-lg p-3 space-y-2"
                    >
                      <p className="text-sm font-medium">{item.etapa}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Percentual (%)</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={1}
                              value={item.percentual}
                              onChange={(e) =>
                                updateItem(
                                  idx,
                                  "percentual",
                                  Number(e.target.value)
                                )
                              }
                              className="flex-1 accent-primary"
                            />
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              className="w-20"
                              value={item.percentual}
                              onChange={(e) =>
                                updateItem(
                                  idx,
                                  "percentual",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Valor (R$)</Label>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.valor}
                            onChange={(e) =>
                              updateItem(idx, "valor", Number(e.target.value))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Auto-calculated totals */}
            <div className="glass-card p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">% Geral (média)</p>
                <p className="text-lg font-bold text-primary">
                  {formatPercent(formTotals.percGeral)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  Valor Total Medido
                </p>
                <p className="text-lg font-bold">
                  {formatCurrency(formTotals.valorTotal)}
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="med-obs">Observações</Label>
              <Textarea
                id="med-obs"
                placeholder="Observações adicionais..."
                value={form.observacoes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, observacoes: e.target.value }))
                }
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : "Salvar Medição"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
