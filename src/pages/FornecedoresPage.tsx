import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/formatters";
import {
  Plus, Search, Star, Building2, Phone, Mail, MapPin,
  CreditCard, Copy, ToggleLeft, ToggleRight, Pencil, Trash2, Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface Fornecedor {
  id: string;
  user_id: string;
  nome: string;
  cnpj: string;
  telefone: string;
  email: string;
  endereco: string;
  banco: string;
  agencia: string;
  conta: string;
  pix: string;
  tipo_pix: string;
  avaliacao: number;
  observacoes: string;
  ativo: boolean;
  created_at: string;
  deleted_at: string | null;
}

interface Transacao {
  id: string;
  tipo: string;
  valor: number;
  data: string;
  descricao: string;
  categoria: string;
  observacoes: string;
}

const TIPOS_PIX = ["CPF", "CNPJ", "Email", "Telefone", "Aleatória"];

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          className={onChange ? "cursor-pointer hover:scale-110 transition-transform" : "cursor-default"}
          onClick={() => onChange?.(s)}
        >
          <Star
            className={`w-4 h-4 ${s <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
          />
        </button>
      ))}
    </div>
  );
}

export default function FornecedoresPage() {
  const { user } = useAuth();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editFornecedor, setEditFornecedor] = useState<Fornecedor | null>(null);
  const [detalheFornecedor, setDetalheFornecedor] = useState<Fornecedor | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    nome: "",
    cnpj: "",
    telefone: "",
    email: "",
    endereco: "",
    banco: "",
    agencia: "",
    conta: "",
    pix: "",
    tipo_pix: "CPF",
    avaliacao: 5,
    observacoes: "",
  });

  const fetchData = useCallback(async () => {
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
    if (fornRes.data) setFornecedores(fornRes.data as Fornecedor[]);
    if (transRes.data) setTransacoes(transRes.data as Transacao[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const onFocus = () => fetchData();
    window.addEventListener("focus", onFocus);
    const interval = setInterval(fetchData, 30000);
    return () => { window.removeEventListener("focus", onFocus); clearInterval(interval); };
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
    if (search === "") return true;
    const s = search.toLowerCase();
    return f.nome?.toLowerCase().includes(s) || f.cnpj?.toLowerCase().includes(s);
  });

  const resetForm = () => setForm({
    nome: "", cnpj: "", telefone: "", email: "", endereco: "",
    banco: "", agencia: "", conta: "", pix: "", tipo_pix: "CPF",
    avaliacao: 5, observacoes: "",
  });

  const openEdit = (f: Fornecedor) => {
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
  };

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
      tipo_pix: form.tipo_pix,
      avaliacao: form.avaliacao,
      observacoes: form.observacoes,
    };

    if (editFornecedor) {
      const { error } = await supabase.from("obra_fornecedores").update(payload).eq("id", editFornecedor.id);
      if (error) toast.error("Erro: " + error.message);
      else toast.success("Fornecedor atualizado!");
    } else {
      const { error } = await supabase.from("obra_fornecedores").insert({ ...payload, user_id: user!.id, ativo: true } as any);
      if (error) toast.error("Erro: " + error.message);
      else toast.success("Fornecedor cadastrado!");
    }

    setSaving(false);
    setShowForm(false);
    setEditFornecedor(null);
    resetForm();
    fetchData();
  };

  const toggleAtivo = async (f: Fornecedor) => {
    const { error } = await supabase.from("obra_fornecedores").update({ ativo: !f.ativo }).eq("id", f.id);
    if (error) toast.error("Erro ao atualizar");
    else { toast.success(f.ativo ? "Fornecedor desativado" : "Fornecedor reativado"); fetchData(); }
  };

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
          {filtered.map((forn, i) => {
            const gasto = getGastoFornecedor(forn.nome);
            return (
              <div
                key={forn.id}
                className={`glass-card p-5 cursor-pointer transition-all hover:scale-[1.02] animate-fade-in-up ${!forn.ativo ? "opacity-50" : ""}`}
                style={{ animationDelay: `${i * 80}ms` }}
                onClick={() => setDetalheFornecedor(forn)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{forn.nome}</h3>
                      {forn.cnpj && <p className="text-xs text-muted-foreground">{forn.cnpj}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(forn); }}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); toggleAtivo(forn); }}>
                      {forn.ativo ? <ToggleRight className="w-4 h-4 text-success" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {forn.telefone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      <span>{forn.telefone}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <StarRating value={forn.avaliacao || 0} />
                    <span className={`text-sm font-semibold ${gasto > 0 ? "text-warning" : "text-muted-foreground"}`}>
                      {formatCurrency(gasto)}
                    </span>
                  </div>
                  {!forn.ativo && (
                    <Badge variant="secondary" className="text-xs">Inativo</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!detalheFornecedor} onOpenChange={(open) => !open && setDetalheFornecedor(null)}>
        <SheetContent className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
          {detalheFornecedor && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
                    <Building2 className="w-4 h-4" />
                  </div>
                  {detalheFornecedor.nome}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {/* Info */}
                <div className="grid grid-cols-2 gap-3">
                  {detalheFornecedor.cnpj && (
                    <div className="p-3 rounded-lg bg-secondary/30">
                      <p className="text-xs text-muted-foreground">CNPJ</p>
                      <p className="text-sm font-medium">{detalheFornecedor.cnpj}</p>
                    </div>
                  )}
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground">Avaliacao</p>
                    <StarRating value={detalheFornecedor.avaliacao || 0} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {detalheFornecedor.telefone && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Telefone</p>
                        <p className="text-sm font-medium">{detalheFornecedor.telefone}</p>
                      </div>
                    </div>
                  )}
                  {detalheFornecedor.email && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">E-mail</p>
                        <p className="text-sm font-medium">{detalheFornecedor.email}</p>
                      </div>
                    </div>
                  )}
                  {detalheFornecedor.endereco && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Endereco</p>
                        <p className="text-sm font-medium">{detalheFornecedor.endereco}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Banking */}
                {(detalheFornecedor.banco || detalheFornecedor.pix) && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <CreditCard className="w-4 h-4" /> Dados Bancarios
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {detalheFornecedor.banco && (
                        <div className="p-3 rounded-lg bg-secondary/30">
                          <p className="text-xs text-muted-foreground">Banco</p>
                          <p className="text-sm font-medium">{detalheFornecedor.banco}</p>
                        </div>
                      )}
                      {detalheFornecedor.agencia && (
                        <div className="p-3 rounded-lg bg-secondary/30">
                          <p className="text-xs text-muted-foreground">Agencia</p>
                          <p className="text-sm font-medium">{detalheFornecedor.agencia}</p>
                        </div>
                      )}
                      {detalheFornecedor.conta && (
                        <div className="p-3 rounded-lg bg-secondary/30">
                          <p className="text-xs text-muted-foreground">Conta</p>
                          <p className="text-sm font-medium">{detalheFornecedor.conta}</p>
                        </div>
                      )}
                    </div>
                    {detalheFornecedor.pix && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                        <div>
                          <p className="text-xs text-muted-foreground">Chave PIX ({detalheFornecedor.tipo_pix || "---"})</p>
                          <p className="text-sm font-medium">{detalheFornecedor.pix}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(detalheFornecedor.pix)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {detalheFornecedor.observacoes && (
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground mb-1">Observações</p>
                    <p className="text-sm">{detalheFornecedor.observacoes}</p>
                  </div>
                )}

                {/* Transaction history */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">
                    Historico de Transacoes ({detalheTransacoes.length} movimentacoes)
                  </h4>
                  {detalheTransacoes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Nenhuma transacao vinculada</p>
                  ) : (
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                      {detalheTransacoes.map((t) => (
                        <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors">
                          <div>
                            <p className="text-sm font-medium">{t.descricao || t.categoria}</p>
                            <p className="text-xs text-muted-foreground">{t.data}</p>
                          </div>
                          <span className="text-sm font-semibold text-destructive">
                            - {formatCurrency(Number(t.valor))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => { openEdit(detalheFornecedor); setDetalheFornecedor(null); }}>
                    <Pencil className="w-4 h-4" /> Editar
                  </Button>
                  <Button variant="destructive" className="gap-2" onClick={() => softDelete(detalheFornecedor)}>
                    <Trash2 className="w-4 h-4" /> Excluir
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditFornecedor(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editFornecedor ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} className="mt-1" placeholder="Ex: Materiais ABC Ltda" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">CNPJ</Label>
                <Input value={form.cnpj} onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))} className="mt-1" placeholder="00.000.000/0000-00" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Telefone</Label>
                <Input value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} className="mt-1" placeholder="(00) 00000-0000" />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="mt-1" placeholder="contato@fornecedor.com" />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Endereco</Label>
              <Input value={form.endereco} onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))} className="mt-1" placeholder="Rua, numero, bairro, cidade" />
            </div>

            {/* Banking */}
            <div className="p-3 rounded-lg border border-border bg-secondary/30 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dados Bancarios</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Banco</Label>
                  <Input value={form.banco} onChange={(e) => setForm((f) => ({ ...f, banco: e.target.value }))} className="mt-1" placeholder="Ex: Bradesco" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Agencia</Label>
                  <Input value={form.agencia} onChange={(e) => setForm((f) => ({ ...f, agencia: e.target.value }))} className="mt-1" placeholder="0000" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Conta</Label>
                  <Input value={form.conta} onChange={(e) => setForm((f) => ({ ...f, conta: e.target.value }))} className="mt-1" placeholder="00000-0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo PIX</Label>
                  <select value={form.tipo_pix} onChange={(e) => setForm((f) => ({ ...f, tipo_pix: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                    {TIPOS_PIX.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Chave PIX</Label>
                  <Input value={form.pix} onChange={(e) => setForm((f) => ({ ...f, pix: e.target.value }))} className="mt-1" placeholder="Chave PIX" />
                </div>
              </div>
            </div>

            {/* Rating */}
            <div>
              <Label className="text-xs text-muted-foreground">Avaliacao</Label>
              <div className="mt-1">
                <StarRating value={form.avaliacao} onChange={(v) => setForm((f) => ({ ...f, avaliacao: v }))} />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} rows={2} className="mt-1" />
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Salvando..." : editFornecedor ? "Salvar Alteracoes" : "Cadastrar Fornecedor"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
