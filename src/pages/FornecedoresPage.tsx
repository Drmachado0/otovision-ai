import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { formatCurrency } from "@/lib/formatters";
import { Plus, Search, Star, Building2, CreditCard, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FornecedorCard } from "./fornecedores/FornecedorCard";
import { FornecedorDetailSheet } from "./fornecedores/FornecedorDetailSheet";
import { FornecedorFormDialog } from "./fornecedores/FornecedorFormDialog";
import { EMPTY_FORM, type Fornecedor, type Transacao } from "./fornecedores/types";

export default function FornecedoresPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editFornecedor, setEditFornecedor] = useState<Fornecedor | null>(null);
  const [detalheFornecedor, setDetalheFornecedor] = useState<Fornecedor | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading: loading, isError } = useQuery({
    queryKey: ["fornecedores-page", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [fornRes, transRes] = await Promise.all([
        supabase
          .from("obra_fornecedores")
          .select("*")
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("obra_transacoes_fluxo")
          .select("id, tipo, valor, data, descricao, categoria, observacoes")
          .is("deleted_at", null)
          .eq("tipo", "Saída"),
      ]);
      if (fornRes.error) throw fornRes.error;
      if (transRes.error) throw transRes.error;
      const fornecedores = (fornRes.data as unknown as Omit<Fornecedor, "ativo" | "tipo_pix">[]).map(f => ({
        ...f,
        ativo: !f.deleted_at,
        tipo_pix: "",
      })) as Fornecedor[];
      return { fornecedores, transacoes: (transRes.data as Transacao[]) ?? [] };
    },
  });

  const fornecedores = data?.fornecedores ?? [];
  const transacoes = data?.transacoes ?? [];

  const _fetchData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["fornecedores-page", user?.id] });
  }, [queryClient, user?.id]);

  useEffect(() => {
    if (isError) toast.error("Erro ao carregar fornecedores. Tentando novamente...");
  }, [isError]);

  useEffect(() => {
    const onFocus = () => fetchData();
    window.addEventListener("focus", onFocus);
    return () => { window.removeEventListener("focus", onFocus); };
  }, [fetchData]);
  useRealtimeSubscription("obra_fornecedores", fetchData);
  useRealtimeSubscription("obra_transacoes_fluxo", fetchData);

  const getGastoFornecedor = (nome: string) => {
    if (!nome) return 0;
    const lower = nome.toLowerCase();
    return transacoes
      .filter((t) => t.observacoes?.toLowerCase().includes(lower) || t.descricao?.toLowerCase().includes(lower))
      .reduce((s, t) => s + Number(t.valor), 0);
  };

  const ativos = fornecedores.filter((f) => f.ativo);
  const totalGasto = ativos.reduce((s, f) => s + getGastoFornecedor(f.nome), 0);
  const topFornecedor = ativos.length > 0
    ? ativos.reduce((top, f) => {
        const gasto = getGastoFornecedor(f.nome);
        return gasto > (top.gasto || 0) ? { nome: f.nome, gasto } : top;
      }, { nome: "-", gasto: 0 })
    : { nome: "-", gasto: 0 };

  const filtered = fornecedores.filter((f) => {
    if (debouncedSearch === "") return true;
    const s = debouncedSearch.toLowerCase();
    return f.nome?.toLowerCase().includes(s) || f.cnpj?.toLowerCase().includes(s);
  });

  const resetForm = () => setForm(EMPTY_FORM);

  const handleSelect = useCallback((f: Fornecedor) => setDetalheFornecedor(f), []);

  const openEdit = useCallback((f: Fornecedor) => {
    setEditFornecedor(f);
    setForm({
      nome: f.nome || "",
      cnpj: f.cnpj || "",
      telefone: f.telefone || "",
      email: f.email || "",
      endereco: f.endereco || "",
      banco: f.banco || "",
      agencia: f.agencia || "",
      conta: f.conta || "",
      pix: f.pix || "",
      tipo_pix: f.tipo_pix || "CPF",
      avaliacao: f.avaliacao || 5,
      observacoes: f.observacoes || "",
    });
    setShowForm(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome) { toast.error("Informe o nome do fornecedor"); return; }
    setSaving(true);

    const payload = {
      nome: form.nome,
      cnpj: form.cnpj,
      telefone: form.telefone,
      email: form.email,
      endereco: form.endereco,
      banco: form.banco,
      agencia: form.agencia,
      conta: form.conta,
      pix: form.pix,
      avaliacao: form.avaliacao,
      observacoes: form.observacoes,
    };

    if (editFornecedor) {
      const { error } = await supabase.from("obra_fornecedores").update(payload).eq("id", editFornecedor.id);
      if (error) toast.error("Erro: " + error.message);
      else toast.success("Fornecedor atualizado!");
    } else {
      const { error } = await supabase.from("obra_fornecedores").insert({ ...payload, user_id: user!.id });
      if (error) toast.error("Erro: " + error.message);
      else toast.success("Fornecedor cadastrado!");
    }

    setSaving(false);
    setShowForm(false);
    setEditFornecedor(null);
    resetForm();
    fetchData();
  };

  const toggleAtivo = useCallback(async (f: Fornecedor) => {
    // "ativo" é derivado de deleted_at — toggle = soft delete / restore
    const { error } = await supabase
      .from("obra_fornecedores")
      .update({ deleted_at: f.ativo ? new Date().toISOString() : null })
      .eq("id", f.id);
    if (error) toast.error("Erro ao atualizar");
    else { toast.success(f.ativo ? "Fornecedor desativado" : "Fornecedor reativado"); fetchData(); }
  }, [fetchData]);

  const softDelete = async (f: Fornecedor) => {
    const { error } = await supabase.from("obra_fornecedores").update({ deleted_at: new Date().toISOString() }).eq("id", f.id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Fornecedor excluído"); setDetalheFornecedor(null); fetchData(); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const detalheTransacoes = detalheFornecedor
    ? transacoes
        .filter((t) =>
          t.observacoes?.toLowerCase().includes(detalheFornecedor.nome.toLowerCase()) ||
          t.descricao?.toLowerCase().includes(detalheFornecedor.nome.toLowerCase())
        )
        .sort((a, b) => b.data.localeCompare(a.data))
    : [];

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="text-2xl font-bold">Fornecedores</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus fornecedores e parceiros</p>
        </div>
        <Button onClick={() => { resetForm(); setEditFornecedor(null); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Fornecedor
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { cls: "stat-card-info", icon: <Users className="w-4 h-4 text-info" />, label: "Fornecedores Ativos", value: String(ativos.length), color: "text-info" },
          { cls: "stat-card-warning", icon: <CreditCard className="w-4 h-4 text-warning" />, label: "Total Gasto", value: formatCurrency(totalGasto), color: "text-warning" },
          { cls: "stat-card-success", icon: <Star className="w-4 h-4 text-success" />, label: "Top Fornecedor", value: topFornecedor.nome, sub: topFornecedor.gasto > 0 ? formatCurrency(topFornecedor.gasto) : "", color: "text-success" },
        ].map((k, i) => (
          <div key={k.label} className={`${k.cls} p-4 animate-fade-in-up`} style={{ animationDelay: `${i * 100}ms` }}>
            <div className="flex items-center gap-2 mb-1">{k.icon}<span className="text-xs text-muted-foreground uppercase tracking-wider">{k.label}</span></div>
            <p className={`text-lg font-bold mt-1 ${k.color}`}>{k.value}</p>
            {"sub" in k && k.sub && <p className="text-xs text-muted-foreground">{k.sub}</p>}
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Building2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum fornecedor encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((forn, i) => (
            <FornecedorCard
              key={forn.id}
              fornecedor={forn}
              gasto={getGastoFornecedor(forn.nome)}
              index={i}
              onSelect={handleSelect}
              onEdit={openEdit}
              onToggleAtivo={toggleAtivo}
            />
          ))}
        </div>
      )}

      {/* Detail Sheet */}
      <FornecedorDetailSheet
        detalheFornecedor={detalheFornecedor}
        detalheTransacoes={detalheTransacoes}
        onClose={() => setDetalheFornecedor(null)}
        onCopy={copyToClipboard}
        onEdit={(f) => { openEdit(f); setDetalheFornecedor(null); }}
        onDelete={softDelete}
      />

      {/* Form Dialog */}
      <FornecedorFormDialog
        open={showForm}
        onOpenChange={(open) => { if (!open) { setShowForm(false); setEditFornecedor(null); resetForm(); } }}
        editing={!!editFornecedor}
        form={form}
        setForm={setForm}
        saving={saving}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
