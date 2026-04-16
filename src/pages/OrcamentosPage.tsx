import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, formatDate, CATEGORIAS_PADRAO, todayLocalISO } from "@/lib/formatters";
import { Plus, FileText, Check, X, Clock, AlertTriangle, ShoppingCart, Trash2, Search } from "lucide-react";
import FornecedorCombobox from "@/components/FornecedorCombobox";
import CategoriaSelect from "@/components/CategoriaSelect";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface OrcamentoItem {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

interface Orcamento {
  id: string;
  user_id: string;
  fornecedor: string;
  descricao: string;
  categoria: string;
  valor_total: number;
  data: string;
  validade: string;
  status: string;
  condicoes_pagamento: string;
  observacoes: string;
  itens: OrcamentoItem[];
  aprovado_por: string | null;
  aprovado_em: string | null;
  created_at: string;
}

type StatusFilter = "Todos" | "Pendente" | "Aprovado" | "Rejeitado";

const STATUS_COLORS: Record<string, string> = {
  Pendente: "badge-warning",
  Aprovado: "badge-success",
  Rejeitado: "badge-danger",
  Vencido: "badge-muted",
};

const EMPTY_ITEM: OrcamentoItem = { descricao: "", quantidade: 1, valor_unitario: 0, valor_total: 0 };

function parseItens(raw: unknown): OrcamentoItem[] {
  if (Array.isArray(raw)) return raw as OrcamentoItem[];
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
}

function getDisplayStatus(orcamento: Orcamento): string {
  if (orcamento.status === "Pendente" && orcamento.validade) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const validade = new Date(orcamento.validade + "T00:00:00");
    if (validade < hoje) return "Vencido";
  }
  return orcamento.status;
}

export default function OrcamentosPage() {
  const { user } = useAuth();
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
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

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from("obra_orcamentos")
      .select("id, user_id, fornecedor, descricao, categoria, valor_total, data, validade, status, condicoes_pagamento, observacoes, itens, aprovado_por, aprovado_em, created_at")
      .is("deleted_at", null)
      .order("data", { ascending: false })
      .limit(500);
    if (data) {
      setOrcamentos(data.map((o: any) => ({
        ...o,
        fornecedor: o.fornecedor || "",
        descricao: o.descricao || "",
        categoria: o.categoria || "",
        status: o.status || "Pendente",
        condicoes_pagamento: o.condicoes_pagamento || "",
        observacoes: o.observacoes || "",
        itens: parseItens(o.itens),
        aprovado_por: o.aprovado_por || null,
        aprovado_em: o.aprovado_em || null,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
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
      validade: form.validade || null,
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
      aprovado_por: user?.email || "",
      aprovado_em: new Date().toISOString(),
    } as any).eq("id", orcamento.id);
    if (error) toast.error("Erro ao aprovar");
    else { toast.success("Orçamento aprovado!"); setSelectedOrcamento(null); fetchData(); }
  };

  const handleReject = async (orcamento: Orcamento) => {
    const { error } = await supabase.from("obra_orcamentos").update({
      status: "Rejeitado",
      aprovado_por: user?.email || "",
      aprovado_em: new Date().toISOString(),
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
    const matchSearch = search === "" ||
      o.fornecedor?.toLowerCase().includes(search.toLowerCase()) ||
      o.descricao?.toLowerCase().includes(search.toLowerCase()) ||
      o.categoria?.toLowerCase().includes(search.toLowerCase());
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
                {filtered.map((o) => {
                  const displayStatus = getDisplayStatus(o);
                  return (
                    <tr key={o.id} className="table-row-interactive cursor-pointer border-b border-border/20" onClick={() => setSelectedOrcamento(o)}>
                      <td className="px-4 py-3">
                        <span className="font-medium">{o.fornecedor || "-"}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-muted-foreground truncate max-w-[200px] block">{o.descricao || "-"}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">{o.categoria || "-"}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(Number(o.valor_total))}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{formatDate(o.data)}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className={displayStatus === "Vencido" ? "text-destructive font-medium" : "text-muted-foreground"}>
                          {o.validade ? formatDate(o.validade) : "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={`text-xs ${STATUS_COLORS[displayStatus] || "badge-muted"}`}>
                          {displayStatus === "Vencido" && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {displayStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(o.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedOrcamento} onOpenChange={(open) => { if (!open) setSelectedOrcamento(null); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedOrcamento && (() => {
            const displayStatus = getDisplayStatus(selectedOrcamento);
            return (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Detalhes do Orçamento
                  </SheetTitle>
                </SheetHeader>

                <div className="space-y-6 mt-6">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between">
                    <Badge className={`text-sm ${STATUS_COLORS[displayStatus] || "badge-muted"}`}>
                      {displayStatus === "Vencido" && <AlertTriangle className="w-3.5 h-3.5 mr-1" />}
                      {displayStatus}
                    </Badge>
                    <span className="text-2xl font-bold">{formatCurrency(Number(selectedOrcamento.valor_total))}</span>
                  </div>

                  <Separator />

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground uppercase block mb-1">Fornecedor</span>
                      <span className="font-medium">{selectedOrcamento.fornecedor}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground uppercase block mb-1">Categoria</span>
                      <span className="font-medium">{selectedOrcamento.categoria || "-"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground uppercase block mb-1">Data</span>
                      <span>{formatDate(selectedOrcamento.data)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground uppercase block mb-1">Validade</span>
                      <span className={displayStatus === "Vencido" ? "text-destructive font-medium" : ""}>
                        {selectedOrcamento.validade ? formatDate(selectedOrcamento.validade) : "-"}
                      </span>
                    </div>
                  </div>

                  {selectedOrcamento.descricao && (
                    <div className="text-sm">
                      <span className="text-xs text-muted-foreground uppercase block mb-1">Descrição</span>
                      <p>{selectedOrcamento.descricao}</p>
                    </div>
                  )}

                  {selectedOrcamento.condicoes_pagamento && (
                    <div className="text-sm">
                      <span className="text-xs text-muted-foreground uppercase block mb-1">Condições de Pagamento</span>
                      <p>{selectedOrcamento.condicoes_pagamento}</p>
                    </div>
                  )}

                  {selectedOrcamento.observacoes && (
                    <div className="text-sm">
                      <span className="text-xs text-muted-foreground uppercase block mb-1">Observações</span>
                      <p>{selectedOrcamento.observacoes}</p>
                    </div>
                  )}

                  {/* Line Items */}
                  {selectedOrcamento.itens && selectedOrcamento.itens.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <span className="text-xs text-muted-foreground uppercase block mb-3">Itens do Orçamento</span>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border/50">
                                <th className="text-left py-2 text-xs font-medium text-muted-foreground">Descrição</th>
                                <th className="text-right py-2 text-xs font-medium text-muted-foreground">Qtd</th>
                                <th className="text-right py-2 text-xs font-medium text-muted-foreground">Unit.</th>
                                <th className="text-right py-2 text-xs font-medium text-muted-foreground">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedOrcamento.itens.map((item, i) => (
                                <tr key={i} className="border-b border-border/20">
                                  <td className="py-2">{item.descricao}</td>
                                  <td className="py-2 text-right text-muted-foreground">{item.quantidade}</td>
                                  <td className="py-2 text-right text-muted-foreground">{formatCurrency(Number(item.valor_unitario))}</td>
                                  <td className="py-2 text-right font-medium">{formatCurrency(Number(item.valor_total))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Approval Info */}
                  {selectedOrcamento.aprovado_por && (
                    <>
                      <Separator />
                      <div className="text-sm">
                        <span className="text-xs text-muted-foreground uppercase block mb-1">
                          {selectedOrcamento.status === "Aprovado" ? "Aprovado por" : "Rejeitado por"}
                        </span>
                        <p>{selectedOrcamento.aprovado_por}</p>
                        {selectedOrcamento.aprovado_em && (
                          <p className="text-xs text-muted-foreground mt-1">em {formatDate(selectedOrcamento.aprovado_em)}</p>
                        )}
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2">
                    {(displayStatus === "Pendente" || displayStatus === "Vencido") && (
                      <div className="flex gap-2">
                        <Button className="flex-1 gap-2" onClick={() => handleApprove(selectedOrcamento)}>
                          <Check className="w-4 h-4" /> Aprovar
                        </Button>
                        <Button variant="destructive" className="flex-1 gap-2" onClick={() => handleReject(selectedOrcamento)}>
                          <X className="w-4 h-4" /> Rejeitar
                        </Button>
                      </div>
                    )}
                    {selectedOrcamento.status === "Aprovado" && (
                      <Button variant="outline" className="gap-2" onClick={() => handleConvertToCompra(selectedOrcamento)}>
                        <ShoppingCart className="w-4 h-4" /> Converter em Compra
                      </Button>
                    )}
                    <Button variant="ghost" className="gap-2 text-destructive hover:text-destructive" onClick={() => handleDelete(selectedOrcamento.id)}>
                      <Trash2 className="w-4 h-4" /> Excluir Orçamento
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Dialog Novo Orçamento */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Orçamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Fornecedor</Label>
              <div className="mt-1">
                <FornecedorCombobox value={form.fornecedor} onChange={(v) => setForm(f => ({ ...f, fornecedor: v }))} />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Descrição</Label>
              <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} className="mt-1" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Categoria</Label>
                <div className="mt-1">
                  <CategoriaSelect value={form.categoria} onChange={(v) => setForm(f => ({ ...f, categoria: v }))} />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Data</Label>
                <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Validade</Label>
                <Input type="date" value={form.validade} onChange={e => setForm(f => ({ ...f, validade: e.target.value }))} className="mt-1" />
              </div>
            </div>

            {/* Line Items */}
            <div className="p-3 rounded-lg border border-border bg-secondary/30 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground uppercase">Itens do Orçamento</Label>
                <Button type="button" size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={addItem}>
                  <Plus className="w-3 h-3" /> Item
                </Button>
              </div>
              {formItens.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    {index === 0 && <span className="text-[10px] text-muted-foreground">Descrição</span>}
                    <Input
                      value={item.descricao}
                      onChange={e => updateItem(index, "descricao", e.target.value)}
                      placeholder="Descrição do item"
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <span className="text-[10px] text-muted-foreground">Qtd</span>}
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantidade}
                      onChange={e => updateItem(index, "quantidade", Number(e.target.value))}
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <span className="text-[10px] text-muted-foreground">Unitário</span>}
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.valor_unitario}
                      onChange={e => updateItem(index, "valor_unitario", Number(e.target.value))}
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <span className="text-[10px] text-muted-foreground">Total</span>}
                    <Input
                      value={formatCurrency(item.valor_total)}
                      readOnly
                      className="text-xs h-8 bg-muted/50"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => removeItem(index)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {formItens.some(i => i.valor_total > 0) && (
                <div className="flex justify-end pt-2 border-t border-border/50">
                  <span className="text-xs text-muted-foreground mr-2">Total dos itens:</span>
                  <span className="text-sm font-bold">{formatCurrency(formItens.reduce((s, i) => s + i.valor_total, 0))}</span>
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Valor Total (R$)</Label>
              <Input type="number" step="0.01" value={form.valor_total} onChange={e => setForm(f => ({ ...f, valor_total: e.target.value }))} className="mt-1" />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Condições de Pagamento</Label>
              <Input value={form.condicoes_pagamento} onChange={e => setForm(f => ({ ...f, condicoes_pagamento: e.target.value }))} className="mt-1" placeholder="Ex: 30/60/90 dias, PIX à vista..." />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} className="mt-1" rows={3} />
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Salvando..." : "Registrar Orçamento"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
