import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { formatCurrency, formatDate, todayLocalISO } from "@/lib/formatters";
import { Plus, FileText, Check, X, Clock, ShoppingCart, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrcamentoRow } from "./orcamentos/OrcamentoRow";
import { OrcamentoDetailSheet } from "./orcamentos/OrcamentoDetailSheet";
import { OrcamentoFormDialog } from "./orcamentos/OrcamentoFormDialog";
import {
  EMPTY_ITEM,
  parseItens,
  getDisplayStatus,
  type OrcamentoItem,
  type Orcamento,
  type StatusFilter,
} from "./orcamentos/types";

export default function OrcamentosPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [saving, setSaving] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<StatusFilter>("Todos");
  const [selectedOrcamento, setSelectedOrcamento] = useState<Orcamento | null>(null);

  const [form, setForm] = useState({
    fornecedor: "",
    descricao: "",
    categoria: "Material",
    valor_total: "",
    data: todayLocalISO(),
    validade: "",
    condicoes_pagamento: "",
    observacoes: "",
  });
  const [formItens, setFormItens] = useState<OrcamentoItem[]>([{ ...EMPTY_ITEM }]);

  const { data, isLoading: loading, isError } = useQuery({
    queryKey: ["orcamentos", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const res = await supabase
        .from("obra_orcamentos")
        .select("id, user_id, fornecedor, descricao, categoria, valor_total, data, validade, status, condicoes_pagamento, observacoes, itens, created_at")
        .is("deleted_at", null)
        .order("data", { ascending: false })
        .limit(500);
      if (res.error) throw res.error;
      return {
        orcamentos: (res.data ?? []).map((o: any) => ({
          ...o,
          fornecedor: o.fornecedor || "",
          descricao: o.descricao || "",
          categoria: o.categoria || "",
          status: o.status || "Pendente",
          condicoes_pagamento: o.condicoes_pagamento || "",
          observacoes: o.observacoes || "",
          itens: parseItens(o.itens),
          aprovado_por: null,
          aprovado_em: null,
        })) as Orcamento[],
      };
    },
  });

  const orcamentos = data?.orcamentos ?? [];

  const _fetchData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["orcamentos", user?.id] });
  }, [queryClient, user?.id]);

  useEffect(() => {
    if (isError) toast.error("Erro ao carregar dados. Tentando novamente...");
  }, [isError]);

  useRealtimeSubscription("obra_orcamentos", fetchData);

  const resetForm = () => {
    setForm({
      fornecedor: "", descricao: "", categoria: "Material", valor_total: "",
      data: todayLocalISO(), validade: "",
      condicoes_pagamento: "", observacoes: "",
    });
    setFormItens([{ ...EMPTY_ITEM }]);
  };

  const updateItem = (index: number, field: keyof OrcamentoItem, value: string | number) => {
    setFormItens(prev => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      if (field === "quantidade" || field === "valor_unitario") {
        item.valor_total = Math.round(Number(item.quantidade) * Number(item.valor_unitario) * 100) / 100;
      }
      updated[index] = item;
      // Auto-sum valor_total
      const soma = updated.reduce((s, i) => s + Number(i.valor_total), 0);
      setForm(f => ({ ...f, valor_total: soma > 0 ? String(soma) : f.valor_total }));
      return updated;
    });
  };

  const addItem = () => setFormItens(prev => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (index: number) => {
    setFormItens(prev => {
      const updated = prev.filter((_, i) => i !== index);
      const soma = updated.reduce((s, i) => s + Number(i.valor_total), 0);
      setForm(f => ({ ...f, valor_total: soma > 0 ? String(soma) : f.valor_total }));
      return updated.length > 0 ? updated : [{ ...EMPTY_ITEM }];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fornecedor || !form.valor_total) {
      toast.error("Preencha fornecedor e valor");
      return;
    }
    setSaving(true);
    const itensLimpos = formItens.filter(i => i.descricao.trim() !== "");
    const { error } = await supabase.from("obra_orcamentos").insert({
      user_id: user!.id,
      fornecedor: form.fornecedor,
      descricao: form.descricao,
      categoria: form.categoria,
      valor_total: Number(form.valor_total),
      data: form.data,
      validade: form.validade || "",
      status: "Pendente",
      condicoes_pagamento: form.condicoes_pagamento,
      observacoes: form.observacoes,
      itens: itensLimpos as any,
    } as any);
    setSaving(false);
    if (error) {
      toast.error("Erro: " + error.message);
    } else {
      toast.success("Orçamento registrado!");
      setShowForm(false);
      resetForm();
      fetchData();
    }
  };

  const handleApprove = async (orcamento: Orcamento) => {
    const { error } = await supabase.from("obra_orcamentos").update({
      status: "Aprovado",
    } as any).eq("id", orcamento.id);
    if (error) toast.error("Erro ao aprovar");
    else { toast.success("Orçamento aprovado!"); setSelectedOrcamento(null); fetchData(); }
  };

  const handleReject = async (orcamento: Orcamento) => {
    const { error } = await supabase.from("obra_orcamentos").update({
      status: "Rejeitado",
    } as any).eq("id", orcamento.id);
    if (error) toast.error("Erro ao rejeitar");
    else { toast.success("Orçamento rejeitado"); setSelectedOrcamento(null); fetchData(); }
  };

  const handleConvertToCompra = async (orcamento: Orcamento) => {
    const { error } = await supabase.from("obra_compras").insert({
      user_id: user!.id,
      fornecedor: orcamento.fornecedor,
      descricao: `[Orçamento] ${orcamento.descricao}`,
      categoria: orcamento.categoria,
      valor_total: orcamento.valor_total,
      data: todayLocalISO(),
      status_entrega: "Pedido",
      forma_pagamento: orcamento.condicoes_pagamento || "PIX",
      observacoes: `Convertido do orçamento de ${formatDate(orcamento.data)} - ${orcamento.fornecedor}`,
    } as any);
    if (error) toast.error("Erro ao converter: " + error.message);
    else { toast.success("Compra criada a partir do orçamento!"); setSelectedOrcamento(null); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("obra_orcamentos").update({
      deleted_at: new Date().toISOString(),
    } as any).eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Orçamento excluído"); setSelectedOrcamento(null); fetchData(); }
  };

  const filtered = orcamentos.filter((o) => {
    const matchSearch = debouncedSearch === "" ||
      o.fornecedor?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      o.descricao?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      o.categoria?.toLowerCase().includes(debouncedSearch.toLowerCase());
    const displayStatus = getDisplayStatus(o);
    const matchStatus = filtroStatus === "Todos" || displayStatus === filtroStatus;
    return matchSearch && matchStatus;
  });

  const totalOrcamentos = filtered.length;
  const valorTotal = filtered.reduce((s, o) => s + Number(o.valor_total), 0);
  const totalAprovados = filtered.filter(o => o.status === "Aprovado").length;
  const totalPendentes = filtered.filter(o => getDisplayStatus(o) === "Pendente").length;

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="text-2xl font-bold">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">Gestão de orçamentos e aprovações</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Orçamento
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { cls: "stat-card-info", icon: <FileText className="w-4 h-4 text-info" />, label: "Total", value: String(totalOrcamentos) },
          { cls: "stat-card-success", icon: <ShoppingCart className="w-4 h-4 text-success" />, label: "Valor Total", value: formatCurrency(valorTotal), color: "text-success" },
          { cls: "stat-card-success", icon: <Check className="w-4 h-4 text-success" />, label: "Aprovados", value: String(totalAprovados), color: "text-success" },
          { cls: "stat-card-warning", icon: <Clock className="w-4 h-4 text-warning" />, label: "Pendentes", value: String(totalPendentes), color: "text-warning" },
        ].map((m, i) => (
          <div key={m.label} className={`${m.cls} p-4 animate-fade-in-up`} style={{ animationDelay: `${i * 100}ms` }}>
            <div className="flex items-center gap-2 mb-1">{m.icon}<span className="text-xs text-muted-foreground uppercase">{m.label}</span></div>
            <p className={`text-lg font-bold ${m.color || ""}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Status Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar orçamentos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-1">
          {(["Todos", "Pendente", "Aprovado", "Rejeitado"] as const).map(t => (
            <Button key={t} size="sm" variant={filtroStatus === t ? "default" : "outline"} className="text-xs h-8" onClick={() => setFiltroStatus(t)}>
              {t === "Pendente" && <Clock className="w-3 h-3 mr-1" />}
              {t === "Aprovado" && <Check className="w-3 h-3 mr-1" />}
              {t === "Rejeitado" && <X className="w-3 h-3 mr-1" />}
              {t}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Nenhum orçamento encontrado</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Fornecedor</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Descrição</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Categoria</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Valor</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Data</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Validade</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <OrcamentoRow
                    key={o.id}
                    orcamento={o}
                    onSelect={setSelectedOrcamento}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      <OrcamentoDetailSheet
        orcamento={selectedOrcamento}
        onClose={() => setSelectedOrcamento(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        onConvertToCompra={handleConvertToCompra}
        onDelete={handleDelete}
      />

      {/* Dialog Novo Orçamento */}
      <OrcamentoFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        form={form}
        setForm={setForm}
        formItens={formItens}
        saving={saving}
        onSubmit={handleSubmit}
        onAddItem={addItem}
        onRemoveItem={removeItem}
        onUpdateItem={updateItem}
      />

    </div>
  );
}
