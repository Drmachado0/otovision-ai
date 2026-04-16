import { useCallback, useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { processRecurrences } from "@/lib/recurrenceEngine";
import {
  Clock, AlertTriangle, DollarSign, CalendarCheck, Search,
  ChevronLeft, ChevronRight, Filter, X, CheckCircle, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ConfirmarPagamentoDialog from "@/components/ConfirmarPagamentoDialog";
import ConfirmDialog from "@/components/ConfirmDialog";

interface ContaPagar {
  id: string;
  tipo: string;
  valor: number;
  data: string;
  data_vencimento: string | null;
  categoria: string;
  descricao: string;
  forma_pagamento: string;
  observacoes: string;
  conta_id: string;
  status: string;
  parcela_numero: number | null;
  parcela_total: number | null;
  recorrencia: string;
  recorrencia_grupo_id: string | null;
  created_at: string;
}

const PAGE_SIZE = 50;

export default function ContasAPagarPage() {
  const { user } = useAuth();
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("todos");
  const [filterVencimento, setFilterVencimento] = useState<"todos" | "hoje" | "vencidas" | "semana">("todos");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // KPIs
  const [totalPendente, setTotalPendente] = useState(0);
  const [countVencidas, setCountVencidas] = useState(0);
  const [totalVencidas, setTotalVencidas] = useState(0);
  const [countHoje, setCountHoje] = useState(0);

  // Payment dialog
  const [pagamentoTarget, setPagamentoTarget] = useState<ContaPagar | null>(null);
  const [pagamentoOpen, setPagamentoOpen] = useState(false);

  // Cancel dialog
  const [cancelTarget, setCancelTarget] = useState<ContaPagar | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const fetchData = useCallback(async () => {
    // KPIs query (all pending)
    const kpiQuery = supabase
      .from("obra_transacoes_fluxo")
      .select("valor, data_vencimento" as any)
      .is("deleted_at", null)
      .eq("status" as any, "pendente")
      .eq("tipo", "Saída");

    // Paginated list query
    let query = supabase
      .from("obra_transacoes_fluxo")
      .select("id, tipo, valor, data, data_vencimento, categoria, descricao, forma_pagamento, observacoes, conta_id, status, parcela_numero, parcela_total, recorrencia, recorrencia_grupo_id, created_at" as any, { count: "exact" })
      .is("deleted_at", null)
      .eq("status" as any, "pendente")
      .eq("tipo", "Saída")
      .order("data_vencimento" as any, { ascending: true, nullsFirst: false });

    if (search) query = query.or(`descricao.ilike.%${search}%,categoria.ilike.%${search}%`);
    if (filterCategoria !== "todos") query = query.eq("categoria", filterCategoria);
    if (filterVencimento === "hoje") query = query.eq("data_vencimento", today);
    if (filterVencimento === "vencidas") query = query.lt("data_vencimento", today);
    if (filterVencimento === "semana") {
      const semana = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
      query = query.lte("data_vencimento", semana);
    }

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);

    const [{ data, count }, { data: kpiData }] = await Promise.all([query, kpiQuery]);

    if (data) setContas(data as unknown as ContaPagar[]);
    if (count !== null) setTotalCount(count);

    if (kpiData) {
      const rows = kpiData as unknown as { valor: number; data_vencimento: string | null }[];
      setTotalPendente(rows.reduce((s, r) => s + Number(r.valor), 0));
      const vencidas = rows.filter(r => r.data_vencimento && r.data_vencimento < today);
      setCountVencidas(vencidas.length);
      setTotalVencidas(vencidas.reduce((s, r) => s + Number(r.valor), 0));
      setCountHoje(rows.filter(r => r.data_vencimento === today).length);
    }

    setLoading(false);
  }, [page, search, filterCategoria, filterVencimento, today]);

  // Process recurring transactions on mount (once)
  const recurrenceRan = useRef(false);
  useEffect(() => {
    if (!recurrenceRan.current) {
      recurrenceRan.current = true;
      processRecurrences().then((n) => {
        if (n > 0) fetchData();
      });
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const onFocus = () => fetchData();
    window.addEventListener("focus", onFocus);
    const interval = setInterval(fetchData, 30000);
    return () => { window.removeEventListener("focus", onFocus); clearInterval(interval); };
  }, [fetchData]);
  useRealtimeSubscription("obra_transacoes_fluxo", fetchData);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handlePagar = (conta: ContaPagar) => {
    setPagamentoTarget(conta);
    setPagamentoOpen(true);
  };

  const handleCancelar = async () => {
    if (!cancelTarget) return;
    const { error } = await supabase
      .from("obra_transacoes_fluxo")
      .update({ status: "cancelado" } as any)
      .eq("id", cancelTarget.id);
    setCancelTarget(null);
    if (error) {
      toast.error("Erro ao cancelar");
    } else {
      toast.success("Lancamento cancelado");
      fetchData();
    }
  };

  const categorias = [...new Set(contas.map(c => c.categoria).filter(Boolean))];

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="page-header">
        <h1 className="text-2xl font-bold">Contas a Pagar</h1>
        <p className="text-sm text-muted-foreground">Pagamentos pendentes de confirmacao</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { cls: "stat-card-warning", icon: <Clock className="w-4 h-4 text-warning" />, label: "Total Pendente", value: formatCurrency(totalPendente), sub: `${totalCount} lancamento(s)` },
          { cls: "stat-card-danger", icon: <AlertTriangle className="w-4 h-4 text-destructive" />, label: "Vencidas", value: formatCurrency(totalVencidas), sub: `${countVencidas} vencida(s)`, color: "text-destructive" },
          { cls: "stat-card-info", icon: <CalendarCheck className="w-4 h-4 text-info" />, label: "Vencem Hoje", value: String(countHoje), sub: "pagamento(s)" },
          { cls: "stat-card-primary", icon: <DollarSign className="w-4 h-4 text-primary" />, label: "Proximos 7 dias", value: formatCurrency(totalPendente), sub: "a vencer" },
        ].map((c, i) => (
          <div key={c.label} className={`${c.cls} p-4 animate-fade-in-up`} style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center gap-2 mb-2">{c.icon}<span className="text-xs text-muted-foreground uppercase">{c.label}</span></div>
            <p className={`text-lg font-bold ${c.color || ""}`}>{c.value}</p>
            {c.sub && <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descricao ou categoria..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1">
          {(["todos", "hoje", "vencidas", "semana"] as const).map(f => (
            <button
              key={f}
              onClick={() => { setFilterVencimento(f); setPage(0); }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                filterVencimento === f ? "bg-primary text-primary-foreground" : "bg-accent/50 text-muted-foreground hover:bg-accent"
              }`}
            >
              {f === "todos" ? "Todos" : f === "hoje" ? "Hoje" : f === "vencidas" ? "Vencidas" : "7 dias"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : contas.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-10 h-10 mx-auto text-success mb-3" />
            <p className="text-muted-foreground">Nenhum pagamento pendente</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Vencimento</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Descricao</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Categoria</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Parcela</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Valor</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {contas.map((c, i) => {
                  const isVencida = c.data_vencimento && c.data_vencimento < today;
                  const isHoje = c.data_vencimento === today;
                  return (
                    <tr
                      key={c.id}
                      className={`border-b border-border/30 transition-colors hover:bg-accent/30 animate-fade-in-up ${isVencida ? "bg-destructive/5" : ""}`}
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isVencida && <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />}
                          <span className={isVencida ? "text-destructive font-medium" : isHoje ? "text-warning font-medium" : "text-muted-foreground"}>
                            {c.data_vencimento ? formatDate(c.data_vencimento) : "-"}
                          </span>
                          {isVencida && <Badge variant="destructive" className="text-[9px]">Vencida</Badge>}
                          {isHoje && <Badge className="text-[9px] bg-warning text-warning-foreground">Hoje</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium max-w-[200px] truncate">{c.descricao || "-"}</td>
                      <td className="px-4 py-3"><span className="badge-muted">{c.categoria || "-"}</span></td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {c.parcela_numero && c.parcela_total ? (
                          <Badge variant="outline" className="text-xs">{c.parcela_numero}/{c.parcela_total}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">{c.recorrencia || "Unica"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-destructive">
                        {formatCurrency(Number(c.valor))}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" onClick={() => handlePagar(c)} className="gap-1 h-7 text-xs">
                            <CheckCircle className="w-3 h-3" /> Pagar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setCancelTarget(c)} className="h-7 text-xs text-muted-foreground hover:text-destructive">
                            <XCircle className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
            <span className="text-xs text-muted-foreground">
              {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount}
            </span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      {pagamentoTarget && user && (
        <ConfirmarPagamentoDialog
          open={pagamentoOpen}
          onClose={() => { setPagamentoOpen(false); setPagamentoTarget(null); }}
          onSuccess={fetchData}
          transacao={{...pagamentoTarget, data_vencimento: pagamentoTarget.data_vencimento ?? undefined, parcela_numero: pagamentoTarget.parcela_numero ?? undefined, parcela_total: pagamentoTarget.parcela_total ?? undefined}}
          userId={user.id}
        />
      )}

      {/* Cancel Dialog */}
      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancelar Lancamento"
        message={`Deseja cancelar "${cancelTarget?.descricao || ""}" de ${cancelTarget ? formatCurrency(Number(cancelTarget.valor)) : ""}?`}
        confirmLabel="Cancelar Lancamento"
        variant="danger"
        onConfirm={handleCancelar}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
