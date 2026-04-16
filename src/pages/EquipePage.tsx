import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/formatters";
import {
  Users,
  Plus,
  Phone,
  Briefcase,
  UserCheck,
  UserX,
  Search,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
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
import ConfirmDialog from "@/components/ConfirmDialog";

interface Funcionario {
  id: string;
  user_id: string;
  nome: string;
  funcao: string;
  telefone: string;
  salario_diario: number;
  status: string;
  observacoes: string;
  created_at: string;
  updated_at: string;
}

const EMPTY_FORM = {
  nome: "",
  funcao: "",
  telefone: "",
  salario_diario: "",
  observacoes: "",
};

export default function EquipePage() {
  const { user } = useAuth();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"Todos" | "Ativos" | "Inativos">("Todos");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Funcionario | null>(null);

  // ---------- fetch ----------
  const fetchData = useCallback(async () => {
    const { data, error } = await supabase
      .from("obra_funcionarios")
      .select("*")
      .order("nome", { ascending: true }) as any;

    if (error) {
      toast.error("Erro ao carregar equipe");
      setLoading(false);
      return;
    }
    setFuncionarios(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useRealtimeSubscription("obra_funcionarios", fetchData);

  // ---------- helpers ----------
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (f: Funcionario) => {
    setEditingId(f.id);
    setForm({
      nome: f.nome,
      funcao: f.funcao ?? "",
      telefone: f.telefone ?? "",
      salario_diario: String(f.salario_diario ?? ""),
      observacoes: f.observacoes ?? "",
    });
    setShowForm(true);
  };

  // ---------- save ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error("Preencha o nome do funcionário");
      return;
    }
    setSaving(true);

    const payload: any = {
      nome: form.nome.trim(),
      funcao: form.funcao.trim(),
      telefone: form.telefone.trim(),
      salario_diario: Number(form.salario_diario) || 0,
      observacoes: form.observacoes.trim(),
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { error } = await supabase
        .from("obra_funcionarios")
        .update(payload as any)
        .eq("id", editingId);
      if (error) {
        toast.error("Erro ao atualizar funcionário");
      } else {
        toast.success("Funcionário atualizado");
      }
    } else {
      payload.user_id = user!.id;
      payload.status = "ativo";
      const { error } = await supabase
        .from("obra_funcionarios")
        .insert(payload as any);
      if (error) {
        toast.error("Erro ao criar funcionário");
      } else {
        toast.success("Funcionário adicionado");
      }
    }

    setSaving(false);
    setShowForm(false);
    resetForm();
  };

  // ---------- toggle status ----------
  const toggleStatus = async (f: Funcionario) => {
    const newStatus = f.status === "ativo" ? "inativo" : "ativo";
    const { error } = await supabase
      .from("obra_funcionarios")
      .update({ status: newStatus, updated_at: new Date().toISOString() } as any)
      .eq("id", f.id);
    if (error) {
      toast.error("Erro ao alterar status");
    } else {
      toast.success(`Funcionário ${newStatus === "ativo" ? "ativado" : "desativado"}`);
    }
  };

  // ---------- delete ----------
  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("obra_funcionarios")
      .delete()
      .eq("id", deleteTarget.id) as any;
    if (error) {
      toast.error("Erro ao excluir funcionário");
    } else {
      toast.success("Funcionário excluído");
    }
    setDeleteTarget(null);
  };

  // ---------- derived ----------
  const filtered = funcionarios.filter((f) => {
    const matchSearch =
      f.nome.toLowerCase().includes(search.toLowerCase()) ||
      (f.funcao ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filtroStatus === "Todos" ||
      (filtroStatus === "Ativos" && f.status === "ativo") ||
      (filtroStatus === "Inativos" && f.status === "inativo");
    return matchSearch && matchStatus;
  });

  const ativos = funcionarios.filter((f) => f.status === "ativo");
  const inativos = funcionarios.filter((f) => f.status === "inativo");
  const custoDiario = ativos.reduce((sum, f) => sum + (f.salario_diario ?? 0), 0);

  // ---------- render ----------
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Equipe</h1>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          Novo Funcionário
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat-card-info glass-card p-4 space-y-1 animate-slide-in">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{funcionarios.length}</p>
        </div>
        <div className="stat-card-success glass-card p-4 space-y-1 animate-slide-in">
          <p className="text-xs text-muted-foreground">Ativos</p>
          <p className="text-2xl font-bold">{ativos.length}</p>
        </div>
        <div className="stat-card-warning glass-card p-4 space-y-1 animate-slide-in">
          <p className="text-xs text-muted-foreground">Inativos</p>
          <p className="text-2xl font-bold">{inativos.length}</p>
        </div>
        <div className="stat-card-danger glass-card p-4 space-y-1 animate-slide-in">
          <p className="text-xs text-muted-foreground">Custo Diário</p>
          <p className="text-lg font-bold">{formatCurrency(custoDiario)}</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou função..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {(["Todos", "Ativos", "Inativos"] as const).map((s) => (
            <Button
              key={s}
              variant={filtroStatus === s ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroStatus(s)}
            >
              {s}
            </Button>
          ))}
        </div>
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
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3 animate-fade-in-up">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">
            {funcionarios.length === 0
              ? "Nenhum funcionário cadastrado"
              : "Nenhum resultado encontrado"}
          </p>
          {funcionarios.length === 0 && (
            <Button variant="outline" size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Cadastrar primeiro funcionário
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((f) => (
            <div
              key={f.id}
              className="glass-card-interactive p-5 space-y-3 animate-fade-in-up"
            >
              {/* Name + status */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{f.nome}</h3>
                  {f.funcao && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      <Briefcase className="w-3 h-3 mr-1" />
                      {f.funcao}
                    </Badge>
                  )}
                </div>
                <Badge className={f.status === "ativo" ? "badge-success" : "badge-muted"}>
                  {f.status === "ativo" ? "Ativo" : "Inativo"}
                </Badge>
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-sm text-muted-foreground">
                {f.telefone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{f.telefone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {formatCurrency(f.salario_diario ?? 0)}
                  </span>
                  <span className="text-xs">/dia</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(f)}
                  className="gap-1 text-xs"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleStatus(f)}
                  className="gap-1 text-xs"
                >
                  {f.status === "ativo" ? (
                    <>
                      <UserX className="w-3.5 h-3.5" />
                      Desativar
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      Ativar
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget(f)}
                  className="gap-1 text-xs text-destructive hover:text-destructive ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="glass-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Funcionário" : "Novo Funcionário"}
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
              <Label htmlFor="funcao">Função</Label>
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

            <div className="space-y-2">
              <Label htmlFor="salario_diario">Salário Diário (R$)</Label>
              <Input
                id="salario_diario"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={form.salario_diario}
                onChange={(e) => setForm({ ...form, salario_diario: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Anotações sobre o funcionário..."
                rows={3}
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => { setShowForm(false); resetForm(); }}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? "Salvando..." : editingId ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir Funcionário"
        message={`Deseja excluir "${deleteTarget?.nome}" permanentemente? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
