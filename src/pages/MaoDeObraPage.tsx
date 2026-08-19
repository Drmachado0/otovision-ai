import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { formatCurrency } from "@/lib/formatters";
import { Plus, Users, HardHat, DollarSign, Calendar, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MaoObraFolhaTab from "@/components/MaoObraFolhaTab";
import MaoObraFolhasMensaisTab from "@/components/MaoObraFolhasMensaisTab";
import MaoObraHistoricoChart from "@/components/MaoObraHistoricoChart";
import { agruparPorMes, ultimosMeses } from "@/lib/folhaMaoObra";
import { TrabalhadorCard } from "./maoDeObra/TrabalhadorCard";
import { TrabalhadorFormDialog } from "./maoDeObra/TrabalhadorFormDialog";
import { TrabalhadorDetailSheet } from "./maoDeObra/TrabalhadorDetailSheet";
import { HistoricoFolhasTable } from "./maoDeObra/HistoricoFolhasTable";
import {
  EMPTY_FORM,
  EMPTY_REGISTRO,
  type Trabalhador,
  type Registro,
  type Folha,
  type Conta,
} from "./maoDeObra/types";

export default function MaoDeObraPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedTrabalhador, setSelectedTrabalhador] = useState<Trabalhador | null>(null);
  const [registroForm, setRegistroForm] = useState(EMPTY_REGISTRO);
  const [savingRegistro, setSavingRegistro] = useState(false);
  const [workerRegistros, setWorkerRegistros] = useState<Registro[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<"Todos" | "Ativos" | "Inativos">("Todos");

  // ---------- fetch trabalhadores ----------
  const {
    data: trabalhadoresData,
    isLoading: loading,
    isError: trabalhadoresError,
  } = useQuery({
    queryKey: ["mao-obra-trabalhadores", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("obra_mao_de_obra")
        .select("*")
        .is("deleted_at", null)
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Trabalhador[];
    },
  });
  const trabalhadores = trabalhadoresData ?? [];

  const fetchTrabalhadores = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["mao-obra-trabalhadores", user?.id] });
  }, [queryClient, user?.id]);

  // ---------- fetch registros do mes ----------
  const { data: registrosData } = useQuery({
    queryKey: ["mao-obra-registros-mes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const now = new Date();
      const inicioMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const res = await (supabase as any)
        .from("obra_mao_obra_registros")
        .select("*")
        .gte("data", inicioMes)
        .order("data", { ascending: false });
      if (res.error) throw res.error;
      return (res.data ?? []) as Registro[];
    },
  });
  const registros = registrosData ?? [];

  const fetchRegistros = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["mao-obra-registros-mes", user?.id] });
  }, [queryClient, user?.id]);

  // ---------- fetch registros 12 meses (gráfico histórico) ----------
  const { data: registros12mData } = useQuery({
    queryKey: ["mao-obra-registros-12m", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const d = new Date();
      d.setMonth(d.getMonth() - 11);
      const inicio = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      const res = await (supabase as any)
        .from("obra_mao_obra_registros")
        .select("*")
        .gte("data", inicio)
        .order("data", { ascending: false });
      if (res.error) throw res.error;
      return (res.data ?? []) as Registro[];
    },
  });
  const registros12m = registros12mData ?? [];

  const fetchRegistros12m = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["mao-obra-registros-12m", user?.id] });
  }, [queryClient, user?.id]);

  // ---------- fetch folhas / contas ----------
  const { data: folhasData } = useQuery({
    queryKey: ["mao-obra-folhas", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const res = await (supabase as any)
        .from("obra_mao_obra_folha")
        .select("id,mes_ref,total_diarias,total_fgts,total_inss,total_quinzena,total_vales,total_vale_alim,total_encerramento,total_ferias,total_horas_extras,total_geral,status")
        .is("deleted_at", null)
        .order("mes_ref", { ascending: false });
      if (res.error) throw res.error;
      return (res.data ?? []) as Folha[];
    },
  });
  const folhas = folhasData ?? [];

  const fetchFolhas = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["mao-obra-folhas", user?.id] });
  }, [queryClient, user?.id]);

  const { data: contasData } = useQuery({
    queryKey: ["mao-obra-contas", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const res = await (supabase as any)
        .from("obra_contas_financeiras")
        .select("id,nome,tipo")
        .eq("ativa", true)
        .order("nome");
      if (res.error) throw res.error;
      return (res.data ?? []) as Conta[];
    },
  });
  const contas = contasData ?? [];

  const _fetchContas = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["mao-obra-contas", user?.id] });
  }, [queryClient, user?.id]);

  useEffect(() => {
    if (trabalhadoresError) toast.error("Erro ao carregar trabalhadores");
  }, [trabalhadoresError]);

  const onRegistrosChange = useCallback(() => {
    fetchRegistros();
    fetchRegistros12m();
  }, [fetchRegistros, fetchRegistros12m]);

  useRealtimeSubscription("obra_mao_de_obra", fetchTrabalhadores);
  useRealtimeSubscription("obra_mao_obra_registros", onRegistrosChange);

  // ---------- fetch worker registros ----------
  const fetchWorkerRegistros = useCallback(async (trabalhadorId: string) => {
    const { data } = await (supabase as any)
      .from("obra_mao_obra_registros")
      .select("*")
      .eq("trabalhador_id", trabalhadorId)
      .order("data", { ascending: false })
      .limit(50);
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

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const openEdit = useCallback((t: Trabalhador) => {
    setEditingId(t.id);
    setForm({
      nome: t.nome,
      funcao: t.funcao ?? "",
      telefone: t.telefone ?? "",
      valor_diaria: String(t.valor_diaria ?? ""),
      valor_hora: String(t.valor_hora ?? ""),
      tipo_contrato: t.tipo_contrato ?? "Diária",
      data_inicio: t.data_inicio ?? EMPTY_FORM.data_inicio,
      observacoes: t.observacoes ?? "",
      incide_encargos: !!t.incide_encargos,
      aliquota_fgts: String(t.aliquota_fgts ?? "8"),
      aliquota_inss: String(t.aliquota_inss ?? "20"),
    });
    setShowForm(true);
  }, []);

  const openDetail = useCallback((t: Trabalhador) => {
    setSelectedTrabalhador(t);
    setRegistroForm(EMPTY_REGISTRO);
    fetchWorkerRegistros(t.id);
  }, [fetchWorkerRegistros]);

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
      incide_encargos: form.incide_encargos,
      aliquota_fgts: Number(form.aliquota_fgts) || 0,
      aliquota_inss: Number(form.aliquota_inss) || 0,
    };

    if (editingId) {
      const { error } = await (supabase as any)
        .from("obra_mao_de_obra")
        .update(payload)
        .eq("id", editingId);
      if (error) {
        toast.error("Erro ao atualizar trabalhador");
      } else {
        toast.success("Trabalhador atualizado");
      }
    } else {
      payload.user_id = user!.id;
      payload.ativo = true;
      const { error } = await (supabase as any)
        .from("obra_mao_de_obra")
        .insert(payload);
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
  const toggleAtivo = useCallback(async (t: Trabalhador) => {
    const novoAtivo = !t.ativo;
    const { error } = await (supabase as any)
      .from("obra_mao_de_obra")
      .update({ ativo: novoAtivo })
      .eq("id", t.id);
    if (error) {
      toast.error("Erro ao alterar status");
    } else {
      toast.success(`Trabalhador ${novoAtivo ? "ativado" : "desativado"}`);
      fetchTrabalhadores();
    }
  }, [fetchTrabalhadores]);

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

    const { error } = await (supabase as any).from("obra_mao_obra_registros").insert({
      user_id: user!.id,
      trabalhador_id: selectedTrabalhador.id,
      data: registroForm.data,
      horas,
      valor,
      etapa: selectedTrabalhador.funcao || "",
      observacoes: registroForm.observacoes,
    });

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
  const encargosEstimados = ativos.reduce((sum, t) => {
    if (!t.incide_encargos) return sum;
    const bruto = (t.valor_diaria ?? 0) * 22;
    return sum + bruto * ((t.aliquota_fgts ?? 0) + (t.aliquota_inss ?? 0)) / 100;
  }, 0);
  const totalRegistrosMes = registros.length;
  const custoAcumuladoMes = registros.reduce(
    (sum, r) => sum + (r.valor ?? 0),
    0
  );

  const trabalhadoresFiltrados = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return trabalhadores.filter((t) => {
      if (statusFilter === "Ativos" && !t.ativo) return false;
      if (statusFilter === "Inativos" && t.ativo) return false;
      if (!q) return true;
      return (
        t.nome.toLowerCase().includes(q) ||
        (t.funcao ?? "").toLowerCase().includes(q)
      );
    });
  }, [trabalhadores, debouncedSearch, statusFilter]);

  const dadosGrafico = useMemo(
    () => agruparPorMes(registros12m, folhas, ultimosMeses(12)),
    [registros12m, folhas]
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
            <h1 className="text-2xl font-bold">Mão de Obra</h1>
            <p className="text-sm text-muted-foreground">
              Gestão de trabalhadores e registros de presença
            </p>
          </div>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          Novo Trabalhador
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
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
            cls: "stat-card-warning",
            icon: <DollarSign className="w-4 h-4 text-warning" />,
            label: "Encargos Est.",
            value: formatCurrency(encargosEstimados),
            color: "text-warning",
          },
          {
            cls: "stat-card-success",
            icon: <Calendar className="w-4 h-4 text-success" />,
            label: "Registros do Mês",
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

      {/* Tabs */}
      <Tabs defaultValue="trabalhadores">
        <TabsList className="grid grid-cols-4 w-full max-w-3xl">
          <TabsTrigger value="trabalhadores">Trabalhadores</TabsTrigger>
          <TabsTrigger value="folhas">Folhas mensais</TabsTrigger>
          <TabsTrigger value="folha">Diárias do mês</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        {/* ---- Trabalhadores ---- */}
        <TabsContent value="trabalhadores" className="space-y-4 mt-4">
          {/* Search + filtros */}
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
                  variant={statusFilter === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>

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
          ) : trabalhadoresFiltrados.length === 0 ? (
            <div className="glass-card p-12 text-center space-y-3 animate-fade-in-up">
              <HardHat className="w-12 h-12 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">
                {trabalhadores.length === 0
                  ? "Nenhum trabalhador cadastrado"
                  : "Nenhum resultado encontrado"}
              </p>
              {trabalhadores.length === 0 && (
                <Button variant="outline" size="sm" onClick={openCreate} className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  Cadastrar primeiro trabalhador
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trabalhadoresFiltrados.map((t) => (
                <TrabalhadorCard
                  key={t.id}
                  trabalhador={t}
                  onOpenDetail={openDetail}
                  onEdit={openEdit}
                  onToggleAtivo={toggleAtivo}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---- Folhas mensais (consolidadas) ---- */}
        <TabsContent value="folhas" className="mt-4">
          <MaoObraFolhasMensaisTab />
        </TabsContent>

        {/* ---- Diárias do mês (registro avulso) ---- */}
        <TabsContent value="folha" className="mt-4">
          {user && (
            <MaoObraFolhaTab
              userId={user.id}
              trabalhadores={trabalhadores}
              registros={registros12m}
              contas={contas}
              folhas={folhas}
              onChange={() => {
                fetchFolhas();
                fetchRegistros();
              }}
            />
          )}
        </TabsContent>

        {/* ---- Histórico ---- */}
        <TabsContent value="historico" className="space-y-4 mt-4">
          <MaoObraHistoricoChart data={dadosGrafico} />
          <HistoricoFolhasTable folhas={folhas} />
        </TabsContent>
      </Tabs>

      {/* Create / Edit Dialog */}
      <TrabalhadorFormDialog
        open={showForm}
        editingId={editingId}
        form={form}
        setForm={setForm}
        saving={saving}
        onSubmit={handleSubmit}
        onClose={closeForm}
      />

      {/* Worker Detail Sheet */}
      <TrabalhadorDetailSheet
        trabalhador={selectedTrabalhador}
        onClose={() => setSelectedTrabalhador(null)}
        workerCustoMes={workerCustoMes}
        workerRegistros={workerRegistros}
        registroForm={registroForm}
        setRegistroForm={setRegistroForm}
        savingRegistro={savingRegistro}
        onRegistro={handleRegistro}
      />
    </div>
  );
}
