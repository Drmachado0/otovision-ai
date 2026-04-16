import { useCallback, useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { formatDate } from "@/lib/formatters";
import { toast } from "sonner";
import {
  Plus,
  BookOpen,
  TrendingUp,
  CalendarDays,
  Sun,
  Cloud,
  CloudRain,
  CloudSun,
  Users,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DiarioEntry {
  id: string;
  user_id: string;
  data: string;
  clima: string;
  atividades: string;
  problemas: string;
  observacoes: string;
  avanco_percentual: number;
  equipes: string[];
  etapas_trabalhadas: string[];
  fotos: string[];
  created_at: string;
  updated_at: string;
}

const CLIMA_OPTIONS = [
  "Ensolarado",
  "Nublado",
  "Chuvoso",
  "Parcialmente Nublado",
];

const CLIMA_CONFIG: Record<
  string,
  { icon: typeof Sun; color: string; badge: string }
> = {
  Ensolarado: { icon: Sun, color: "text-yellow-400", badge: "badge-warning" },
  Nublado: { icon: Cloud, color: "text-gray-400", badge: "badge-muted" },
  Chuvoso: { icon: CloudRain, color: "text-blue-400", badge: "badge-info" },
  "Parcialmente Nublado": {
    icon: CloudSun,
    color: "text-orange-400",
    badge: "badge-warning",
  },
};

const emptyForm = {
  data: new Date().toISOString().slice(0, 10),
  clima: "Ensolarado",
  atividades: "",
  problemas: "",
  observacoes: "",
  avanco_percentual: 0,
  equipes: "",
  etapas_trabalhadas: "",
};

export default function DiarioObraPage() {
  const { session } = useAuth();
  const [entries, setEntries] = useState<DiarioEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from("obra_diario" as any)
      .select("*")
      .order("data", { ascending: false });
    if (data) setEntries(data as unknown as DiarioEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  useRealtimeSubscription("obra_diario", fetchData);

  const stats = useMemo(() => {
    const total = entries.length;
    const mediaAvanco =
      total > 0
        ? entries.reduce((s, e) => s + (e.avanco_percentual || 0), 0) / total
        : 0;
    const ultimoRegistro = entries.length > 0 ? entries[0].data : null;
    return { total, mediaAvanco, ultimoRegistro };
  }, [entries]);

  const openNew = () => {
    setForm(emptyForm);
    setEditId(null);
    setDialogOpen(true);
  };

  const openEdit = (entry: DiarioEntry) => {
    setForm({
      data: entry.data || "",
      clima: entry.clima || "Ensolarado",
      atividades: entry.atividades || "",
      problemas: entry.problemas || "",
      observacoes: entry.observacoes || "",
      avanco_percentual: entry.avanco_percentual || 0,
      equipes: Array.isArray(entry.equipes) ? entry.equipes.join(", ") : "",
      etapas_trabalhadas: Array.isArray(entry.etapas_trabalhadas)
        ? entry.etapas_trabalhadas.join(", ")
        : "",
    });
    setEditId(entry.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.data) {
      toast.error("Data e obrigatoria");
      return;
    }
    if (!form.atividades.trim()) {
      toast.error("Atividades e obrigatorio");
      return;
    }
    setSaving(true);

    const equipesArr = form.equipes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const etapasArr = form.etapas_trabalhadas
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      data: form.data,
      clima: form.clima,
      atividades: form.atividades,
      problemas: form.problemas,
      observacoes: form.observacoes,
      avanco_percentual: Number(form.avanco_percentual),
      equipes: equipesArr,
      etapas_trabalhadas: etapasArr,
      fotos: [],
    };

    if (editId) {
      const { error } = await (supabase.from("obra_diario" as any) as any)
        .update(payload)
        .eq("id", editId);
      if (error) toast.error("Erro ao atualizar registro");
      else toast.success("Registro atualizado");
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await (supabase.from("obra_diario" as any) as any).insert({
        ...payload,
        user_id: user!.id,
      });
      if (error) toast.error("Erro ao criar registro");
      else toast.success("Registro criado");
    }
    setSaving(false);
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase.from("obra_diario" as any) as any)
      .delete()
      .eq("id", id);
    if (error) toast.error("Erro ao excluir registro");
    else {
      toast.success("Registro excluido");
      fetchData();
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getClimaConfig = (clima: string) =>
    CLIMA_CONFIG[clima] || CLIMA_CONFIG["Ensolarado"];

  // --- Render ---

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Diario de Obra</h1>
            <p className="text-sm text-muted-foreground">
              Registre e acompanhe o dia a dia da obra
            </p>
          </div>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Registro
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card stat-card-info p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-info" />
            <div>
              <p className="text-xs text-muted-foreground">Total Registros</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="glass-card stat-card-success p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-success" />
            <div>
              <p className="text-xs text-muted-foreground">Media Avanco %</p>
              <p className="text-2xl font-bold">
                {stats.mediaAvanco.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
        <div className="glass-card stat-card-info p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-info" />
            <div>
              <p className="text-xs text-muted-foreground">Ultimo Registro</p>
              <p className="text-2xl font-bold">
                {stats.ultimoRegistro
                  ? formatDate(stats.ultimoRegistro)
                  : "-"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="glass-card p-4 rounded-xl animate-pulse space-y-3"
            >
              <div className="h-4 bg-muted/30 rounded w-1/4" />
              <div className="h-3 bg-muted/20 rounded w-3/4" />
              <div className="h-3 bg-muted/20 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && entries.length === 0 && (
        <div className="glass-card p-12 rounded-xl text-center space-y-4">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-semibold">Nenhum registro encontrado</h3>
          <p className="text-sm text-muted-foreground">
            Clique em "Novo Registro" para adicionar o primeiro diario de obra.
          </p>
          <Button onClick={openNew} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Registro
          </Button>
        </div>
      )}

      {/* Timeline / Entry List */}
      {!loading && entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((entry, idx) => {
            const climaCfg = getClimaConfig(entry.clima);
            const ClimaIcon = climaCfg.icon;
            const isExpanded = expandedId === entry.id;
            const equipesArr = Array.isArray(entry.equipes)
              ? entry.equipes
              : [];
            const etapasArr = Array.isArray(entry.etapas_trabalhadas)
              ? entry.etapas_trabalhadas
              : [];

            return (
              <div
                key={entry.id}
                className="glass-card rounded-xl overflow-hidden animate-slide-in"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {/* Summary Row */}
                <button
                  className="w-full p-4 flex items-center gap-4 text-left hover:bg-muted/10 transition-colors"
                  onClick={() => toggleExpand(entry.id)}
                >
                  {/* Date */}
                  <div className="min-w-[90px]">
                    <p className="text-sm font-semibold">
                      {formatDate(entry.data)}
                    </p>
                  </div>

                  {/* Clima Badge */}
                  <Badge
                    variant="outline"
                    className={`${climaCfg.badge} gap-1 shrink-0`}
                  >
                    <ClimaIcon className="h-3 w-3" />
                    {entry.clima}
                  </Badge>

                  {/* Atividades preview */}
                  <p className="text-sm text-muted-foreground truncate flex-1">
                    {entry.atividades
                      ? entry.atividades.slice(0, 80) +
                        (entry.atividades.length > 80 ? "..." : "")
                      : "-"}
                  </p>

                  {/* Avanco */}
                  <div className="text-right min-w-[60px] shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {entry.avanco_percentual ?? 0}%
                    </span>
                  </div>

                  {/* Equipes count */}
                  <div className="flex items-center gap-1 text-muted-foreground shrink-0 min-w-[50px]">
                    <Users className="h-3.5 w-3.5" />
                    <span className="text-xs">{equipesArr.length}</span>
                  </div>

                  {/* Chevron */}
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-border/50 p-4 space-y-4 bg-muted/5 animate-fade-in-up">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Atividades
                        </p>
                        <p className="text-sm whitespace-pre-wrap">
                          {entry.atividades || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Problemas
                        </p>
                        <p className="text-sm whitespace-pre-wrap">
                          {entry.problemas || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Observacoes
                        </p>
                        <p className="text-sm whitespace-pre-wrap">
                          {entry.observacoes || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Avanco Percentual
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{
                                width: `${Math.min(entry.avanco_percentual || 0, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-bold">
                            {entry.avanco_percentual ?? 0}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Equipes */}
                    {equipesArr.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Equipes
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {equipesArr.map((eq, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="badge-info text-xs"
                            >
                              {eq}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Etapas */}
                    {etapasArr.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Etapas Trabalhadas
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {etapasArr.map((et, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="badge-success text-xs"
                            >
                              {et}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(entry);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(entry.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Editar Registro" : "Novo Registro"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Data */}
            <div className="space-y-1.5">
              <Label htmlFor="diario-data">Data</Label>
              <Input
                id="diario-data"
                type="date"
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
              />
            </div>

            {/* Clima */}
            <div className="space-y-1.5">
              <Label>Clima</Label>
              <Select
                value={form.clima}
                onValueChange={(v) => setForm({ ...form, clima: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o clima" />
                </SelectTrigger>
                <SelectContent>
                  {CLIMA_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Atividades */}
            <div className="space-y-1.5">
              <Label htmlFor="diario-atividades">Atividades *</Label>
              <Textarea
                id="diario-atividades"
                rows={3}
                placeholder="Descreva as atividades realizadas..."
                value={form.atividades}
                onChange={(e) =>
                  setForm({ ...form, atividades: e.target.value })
                }
              />
            </div>

            {/* Problemas */}
            <div className="space-y-1.5">
              <Label htmlFor="diario-problemas">Problemas</Label>
              <Textarea
                id="diario-problemas"
                rows={2}
                placeholder="Problemas encontrados..."
                value={form.problemas}
                onChange={(e) =>
                  setForm({ ...form, problemas: e.target.value })
                }
              />
            </div>

            {/* Observacoes */}
            <div className="space-y-1.5">
              <Label htmlFor="diario-obs">Observacoes</Label>
              <Textarea
                id="diario-obs"
                rows={2}
                placeholder="Observacoes gerais..."
                value={form.observacoes}
                onChange={(e) =>
                  setForm({ ...form, observacoes: e.target.value })
                }
              />
            </div>

            {/* Avanco Percentual */}
            <div className="space-y-1.5">
              <Label htmlFor="diario-avanco">Avanco Percentual (%)</Label>
              <Input
                id="diario-avanco"
                type="number"
                min={0}
                max={100}
                value={form.avanco_percentual}
                onChange={(e) =>
                  setForm({
                    ...form,
                    avanco_percentual: Math.min(
                      100,
                      Math.max(0, Number(e.target.value))
                    ),
                  })
                }
              />
            </div>

            {/* Equipes */}
            <div className="space-y-1.5">
              <Label htmlFor="diario-equipes">
                Equipes{" "}
                <span className="text-xs text-muted-foreground">
                  (separadas por virgula)
                </span>
              </Label>
              <Input
                id="diario-equipes"
                placeholder="Ex: Eletrica, Hidraulica, Alvenaria"
                value={form.equipes}
                onChange={(e) => setForm({ ...form, equipes: e.target.value })}
              />
            </div>

            {/* Etapas Trabalhadas */}
            <div className="space-y-1.5">
              <Label htmlFor="diario-etapas">
                Etapas Trabalhadas{" "}
                <span className="text-xs text-muted-foreground">
                  (separadas por virgula)
                </span>
              </Label>
              <Input
                id="diario-etapas"
                placeholder="Ex: Fundacao, Estrutura, Cobertura"
                value={form.etapas_trabalhadas}
                onChange={(e) =>
                  setForm({ ...form, etapas_trabalhadas: e.target.value })
                }
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editId ? "Salvar" : "Criar Registro"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
