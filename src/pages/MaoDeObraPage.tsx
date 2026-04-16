import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, formatDate, todayLocalISO } from "@/lib/formatters";
import {
  Plus,
  Users,
  HardHat,
  Clock,
  DollarSign,
  Phone,
  Calendar,
  Pencil,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Trabalhador {
  id: string;
  user_id: string;
  nome: string;
  funcao: string;
  telefone: string;
  valor_diaria: number;
  valor_hora: number;
  tipo_contrato: string;
  etapa_id: string | null;
  ativo: boolean;
  data_inicio: string;
  data_fim: string | null;
  observacoes: string;
  created_at: string;
  deleted_at: string | null;
}

interface Registro {
  id: string;
  user_id: string;
  trabalhador_id: string;
  data: string;
  horas: number;
  valor: number;
  etapa: string;
  observacoes: string;
  created_at: string;
}

const EMPTY_FORM = {
  nome: "",
  funcao: "",
  telefone: "",
  valor_diaria: "",
  valor_hora: "",
  tipo_contrato: "Di\u00e1ria",
  data_inicio: todayLocalISO(),
  observacoes: "",
};

const EMPTY_REGISTRO = {
  data: todayLocalISO(),
  horas: "",
  observacoes: "",
};

export default function MaoDeObraPage() {
  const { user } = useAuth();
  const [trabalhadores, setTrabalhadores] = useState<Trabalhador[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedTrabalhador, setSelectedTrabalhador] = useState<Trabalhador | null>(null);
  const [registroForm, setRegistroForm] = useState(EMPTY_REGISTRO);
  const [savingRegistro, setSavingRegistro] = useState(false);
  const [workerRegistros, setWorkerRegistros] = useState<Registro[]>([]);

  // ---------- fetch trabalhadores ----------
  const fetchTrabalhadores = useCallback(async () => {
    const { data, error } = await supabase
      .from("obra_mao_de_obra")
      .select("*")
      .is("deleted_at", null)
      .order("nome", { ascending: true }) as any;

    if (error) {
      toast.error("Erro ao carregar trabalhadores");
      setLoading(false);
      return;
    }
    setTrabalhadores(data ?? []);
    setLoading(false);
  }, []);

  // ---------- fetch registros do mes ----------
  const fetchRegistros = useCallback(async () => {
    const now = new Date();
    const inicioMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const { data } = await supabase
      .from("obra_mao_obra_registros")
      .select("*")
      .gte("data", inicioMes)
      .order("data", { ascending: false }) as any;
    setRegistros(data ?? []);
  }, []);

  useEffect(() => {
    fetchTrabalhadores();
    fetchRegistros();
  }, [fetchTrabalhadores, fetchRegistros]);

  useRealtimeSubscription("obra_mao_de_obra", fetchTrabalhadores);
  useRealtimeSubscription("obra_mao_obra_registros", fetchRegistros);

  // ---------- fetch worker registros ----------
  const fetchWorkerRegistros = useCallback(async (trabalhadorId: string) => {
    const { data } = await supabase
      .from("obra_mao_obra_registros")
      .select("*")
      .eq("trabalhador_id", trabalhadorId)
      .order("data", { ascending: false })
      .limit(50) as any;
    setWorkerRegistros(data ?? []);
  }, []);

  // ---------- helpers ----------
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (t: Trabalhador) => {
    setEditingId(t.id);
    setForm({
      nome: t.nome,
      funcao: t.funcao ?? "",
      telefone: t.telefone ?? "",
      valor_diaria: String(t.valor_diaria ?? ""),
      valor_hora: String(t.valor_hora ?? ""),
      tipo_contrato: t.tipo_contrato ?? "Di\u00e1ria",
      data_inicio: t.data_inicio ?? todayLocalISO(),
      observacoes: t.observacoes ?? "",
    });
    setShowForm(true);
  };

  const openDetail = (t: Trabalhador) => {
    setSelectedTrabalhador(t);
    setRegistroForm(EMPTY_REGISTRO);
    fetchWorkerRegistros(t.id);
  };

  // ---------- save trabalhador ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error("Preencha o nome do trabalhador");
      return;
    }
    setSaving(true);

    const payload: any = {
      nome: form.nome.trim(),
      funcao: form.funcao.trim(),
      telefone: form.telefone.trim(),
      valor_diaria: Number(form.valor_diaria) || 0,
      valor_hora: Number(form.valor_hora) || 0,
      tipo_contrato: form.tipo_contrato,
      data_inicio: form.data_inicio,
      observacoes: form.observacoes.trim(),
    };

    if (editingId) {
      const { error } = await supabase
        .from("obra_mao_de_obra")
        .update(payload as any)
        .eq("id", editingId);
      if (error) {
        toast.error("Erro ao atualizar trabalhador");
      } else {
        toast.success("Trabalhador atualizado");
      }
    } else {
      payload.user_id = user!.id;
      payload.ativo = true;
      const { error } = await supabase
        .from("obra_mao_de_obra")
        .insert(payload as any);
      if (error) {
        toast.error("Erro ao criar trabalhador");
      } else {
        toast.success("Trabalhador adicionado");
      }
    }

    setSaving(false);
    setShowForm(false);
    resetForm();
    fetchTrabalhadores();
  };

  // ---------- toggle ativo ----------
  const toggleAtivo = async (t: Trabalhador) => {
    const novoAtivo = !t.ativo;
    const { error } = await supabase
      .from("obra_mao_de_obra")
      .update({ ativo: novoAtivo } as any)
      .eq("id", t.id);
    if (error) {
      toast.error("Erro ao alterar status");
    } else {
      toast.success(`Trabalhador ${novoAtivo ? "ativado" : "desativado"}`);
      fetchTrabalhadores();
    }
  };

  // ---------- registrar dia ----------
  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrabalhador) return;
    if (!registroForm.data) {
      toast.error("Preencha a data");
      return;
    }
    setSavingRegistro(true);

    const horas = Number(registroForm.horas) || 0;
    let valor = 0;
    if (selectedTrabalhador.tipo_contrato === "Hora") {
      valor = horas * (selectedTrabalhador.valor_hora || 0);
    } else {
      valor = selectedTrabalhador.valor_diaria || 0;
    }

    const { error } = await supabase.from("obra_mao_obra_registros").insert({
      user_id: user!.id,
      trabalhador_id: selectedTrabalhador.id,
      data: registroForm.data,
      horas,
      valor,
      etapa: selectedTrabalhador.funcao || "",
      observacoes: registroForm.observacoes,
    } as any);

    setSavingRegistro(false);
    if (error) {
      toast.error("Erro ao registrar: " + error.message);
    } else {
      toast.success("Dia registrado com sucesso");
      setRegistroForm(EMPTY_REGISTRO);
      fetchWorkerRegistros(selectedTrabalhador.id);
      fetchRegistros();
    }
  };

  // ---------- derived ----------
  const ativos = trabalhadores.filter((t) => t.ativo);
  const custoMensalEstimado = ativos.reduce(
    (sum, t) => sum + (t.valor_diaria ?? 0) * 22,
    0
  );
  const totalRegistrosMes = registros.length;
  const custoAcumuladoMes = registros.reduce(
    (sum, r) => sum + (r.valor ?? 0),
    0
  );

  // worker detail monthly cost
  const workerCustoMes = workerRegistros
    .filter((r) => {
      const now = new Date();
      const inicioMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      return r.data >= inicioMes;
    })
    .reduce((sum, r) => sum + (r.valor ?? 0), 0);

  // ---------- render ----------
  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HardHat className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">M\u00e3o de Obra</h1>
            <p className="text-sm text-muted-foreground">
              Gest\u00e3o de trabalhadores e registros de presen\u00e7a
            </p>
          </div>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          Novo Trabalhador
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            cls: "stat-card-info",
            icon: <Users className="w-4 h-4 text-info" />,
            label: "Total Ativos",
            value: String(ativos.length),
          },
          {
            cls: "stat-card-warning",
            icon: <DollarSign className="w-4 h-4 text-warning" />,
            label: "Custo Mensal Est.",
            value: formatCurrency(custoMensalEstimado),
            color: "text-warning",
          },
          {
            cls: "stat-card-success",
            icon: <Calendar className="w-4 h-4 text-success" />,
            label: "Registros do M\u00eas",
            value: String(totalRegistrosMes),
            color: "text-success",
          },
          {
            cls: "stat-card-danger",
            icon: <DollarSign className="w-4 h-4 text-danger" />,
            label: "Custo Acumulado",
            value: formatCurrency(custoAcumuladoMes),
            color: "text-danger",
          },
        ].map((m, i) => (
          <div
            key={m.label}
            className={`${m.cls} p-4 animate-fade-in-up`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-center gap-2 mb-1">
              {m.icon}
              <span className="text-xs text-muted-foreground uppercase">
                {m.label}
              </span>
            </div>
            <p className={`text-lg font-bold ${m.color || ""}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-5 space-y-3 animate-pulse">
              <div className="h-5 bg-muted/30 rounded w-2/3" />
              <div className="h-4 bg-muted/20 rounded w-1/2" />
              <div className="h-4 bg-muted/20 rounded w-1/3" />
              <div className="h-4 bg-muted/20 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : trabalhadores.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3 animate-fade-in-up">
          <HardHat className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">
            Nenhum trabalhador cadastrado
          </p>
          <Button variant="outline" size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Cadastrar primeiro trabalhador
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trabalhadores.map((t) => (
            <div
              key={t.id}
              className="glass-card-interactive p-5 space-y-3 animate-fade-in-up cursor-pointer"
              onClick={() => openDetail(t)}
            >
              {/* Name + status */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{t.nome}</h3>
                  {t.funcao && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      <HardHat className="w-3 h-3 mr-1" />
                      {t.funcao}
                    </Badge>
                  )}
                </div>
                <Badge className={t.ativo ? "badge-success" : "badge-muted"}>
                  {t.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-sm text-muted-foreground">
                {t.telefone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{t.telefone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span className="font-medium text-foreground">
                    {formatCurrency(t.valor_diaria ?? 0)}
                  </span>
                  <span className="text-xs">/di\u00e1ria</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  <Badge variant="outline" className="text-xs">
                    {t.tipo_contrato || "Di\u00e1ria"}
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              <div
                className="flex items-center gap-2 pt-1 border-t border-border/50"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(t)}
                  className="gap-1 text-xs"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAtivo(t)}
                  className="gap-1 text-xs"
                >
                  {t.ativo ? (
                    <>
                      <ToggleRight className="w-3.5 h-3.5" />
                      Desativar
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-3.5 h-3.5" />
                      Ativar
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="glass-card sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Trabalhador" : "Novo Trabalhador"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                placeholder="Nome completo"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="funcao">Fun\u00e7\u00e3o</Label>
              <Input
                id="funcao"
                placeholder="Ex: Pedreiro, Eletricista..."
                value={form.funcao}
                onChange={(e) => setForm({ ...form, funcao: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                placeholder="(00) 00000-0000"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="valor_diaria">Valor Di\u00e1ria (R$)</Label>
                <Input
                  id="valor_diaria"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={form.valor_diaria}
                  onChange={(e) =>
                    setForm({ ...form, valor_diaria: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor_hora">Valor Hora (R$)</Label>
                <Input
                  id="valor_hora"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={form.valor_hora}
                  onChange={(e) =>
                    setForm({ ...form, valor_hora: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="tipo_contrato">Tipo de Contrato</Label>
                <select
                  id="tipo_contrato"
                  value={form.tipo_contrato}
                  onChange={(e) =>
                    setForm({ ...form, tipo_contrato: e.target.value })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option>Di\u00e1ria</option>
                  <option>Hora</option>
                  <option>Mensal</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_inicio">Data In\u00edcio</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={form.data_inicio}
                  onChange={(e) =>
                    setForm({ ...form, data_inicio: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observa\u00e7\u00f5es</Label>
              <Input
                id="observacoes"
                placeholder="Anota\u00e7\u00f5es sobre o trabalhador..."
                value={form.observacoes}
                onChange={(e) =>
                  setForm({ ...form, observacoes: e.target.value })
                }
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving
                  ? "Salvando..."
                  : editingId
                  ? "Atualizar"
                  : "Criar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Worker Detail Sheet */}
      <Sheet
        open={!!selectedTrabalhador}
        onOpenChange={(open) => {
          if (!open) setSelectedTrabalhador(null);
        }}
      >
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedTrabalhador && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <HardHat className="w-5 h-5 text-primary" />
                  {selectedTrabalhador.nome}
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Worker info summary */}
                <div className="glass-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Fun\u00e7\u00e3o
                    </span>
                    <span className="text-sm font-medium">
                      {selectedTrabalhador.funcao || "-"}
                    </span>
                  </div>
                  {selectedTrabalhador.telefone && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Telefone
                      </span>
                      <span className="text-sm font-medium flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {selectedTrabalhador.telefone}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Valor Di\u00e1ria
                    </span>
                    <span className="text-sm font-medium">
                      {formatCurrency(selectedTrabalhador.valor_diaria ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Valor Hora
                    </span>
                    <span className="text-sm font-medium">
                      {formatCurrency(selectedTrabalhador.valor_hora ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Contrato
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {selectedTrabalhador.tipo_contrato || "Di\u00e1ria"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      In\u00edcio
                    </span>
                    <span className="text-sm font-medium">
                      {formatDate(selectedTrabalhador.data_inicio)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Status
                    </span>
                    <Badge
                      className={
                        selectedTrabalhador.ativo
                          ? "badge-success"
                          : "badge-muted"
                      }
                    >
                      {selectedTrabalhador.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>

                {/* Monthly cost summary */}
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground uppercase">
                      Custo do M\u00eas
                    </span>
                  </div>
                  <p className="text-xl font-bold">
                    {formatCurrency(workerCustoMes)}
                  </p>
                </div>

                {/* Registrar Dia form */}
                <div className="glass-card p-4 space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Registrar Dia
                  </h4>
                  <form onSubmit={handleRegistro} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Data
                        </Label>
                        <Input
                          type="date"
                          value={registroForm.data}
                          onChange={(e) =>
                            setRegistroForm({
                              ...registroForm,
                              data: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Horas
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          placeholder="8"
                          value={registroForm.horas}
                          onChange={(e) =>
                            setRegistroForm({
                              ...registroForm,
                              horas: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Observa\u00e7\u00f5es
                      </Label>
                      <Input
                        placeholder="Ex: Servi\u00e7o de alvenaria..."
                        value={registroForm.observacoes}
                        onChange={(e) =>
                          setRegistroForm({
                            ...registroForm,
                            observacoes: e.target.value,
                          })
                        }
                      />
                    </div>
                    {/* Auto-calc preview */}
                    <div className="text-xs text-muted-foreground">
                      Valor estimado:{" "}
                      <span className="font-semibold text-foreground">
                        {formatCurrency(
                          selectedTrabalhador.tipo_contrato === "Hora"
                            ? (Number(registroForm.horas) || 0) *
                                (selectedTrabalhador.valor_hora || 0)
                            : selectedTrabalhador.valor_diaria || 0
                        )}
                      </span>
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      className="w-full gap-1.5"
                      disabled={savingRegistro}
                    >
                      <Plus className="w-4 h-4" />
                      {savingRegistro ? "Salvando..." : "Registrar Dia"}
                    </Button>
                  </form>
                </div>

                {/* Recent registros */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Registros Recentes
                  </h4>
                  {workerRegistros.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum registro encontrado
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {workerRegistros.map((r) => (
                        <div
                          key={r.id}
                          className="glass-card p-3 flex items-center justify-between animate-fade-in-up"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {formatDate(r.data)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {r.horas}h
                              {r.observacoes ? ` - ${r.observacoes}` : ""}
                            </p>
                          </div>
                          <span className="text-sm font-semibold">
                            {formatCurrency(r.valor ?? 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
