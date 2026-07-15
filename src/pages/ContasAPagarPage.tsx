import { memo, useCallback, useEffect, useState, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { formatCurrency, formatDate, todayLocalISO } from "@/lib/formatters";
import { processRecurrences } from "@/lib/recurrenceEngine";
import { flattenParcelasPendentes, type CompraComParcelas, type ParcelaPendenteRow } from "@/lib/contasAPagarParcelas";
import {
  Clock, AlertTriangle, DollarSign, CalendarCheck, Search,
  ChevronLeft, ChevronRight, CheckCircle, XCircle, Package,
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
  origem?: "fluxo" | "compra-parcela";
  compra_id?: string;
  numero_parcela?: number;
}

const PAGE_SIZE = 50;

interface ContaRowProps {
  conta: ContaPagar;
  index: number;
  today: string;
  onPagar: (c: ContaPagar) => void;
  onCancelar: (c: ContaPagar) => void;
}

const ContaRow = memo(function ContaRow({ conta: c, index: i, today, onPagar, onCancelar }: ContaRowProps) {
  const isVencida = c.data_vencimento && c.data_vencimento < today;
  const isHoje = c.data_vencimento === today;
  const isParcelaCompra = c.origem === "compra-parcela";
  return (
    <tr
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
      <td className="px-4 py-3 font-medium max-w-[260px] truncate">
        <div className="flex items-center gap-2">
          {isParcelaCompra && <Package className="w-3 h-3 text-primary shrink-0" />}
          <span className="truncate">{c.descricao || "-"}</span>
        </div>
      </td>
      <td className="px-4 py-3"><span className="badge-muted">{c.categoria || "-"}</span></td>
      <td className="px-4 py-3 hidden md:table-cell">
        {c.parcela_numero && c.parcela_total ? (
          <Badge variant="outline" className="text-xs">{c.parcela_numero}/{c.parcela_total}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">{c.recorrencia || "Única"}</span>
        )}
      </td>
      <td className="px-4 py-3 text-right font-semibold text-destructive">
        {formatCurrency(Number(c.valor))}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-1">
          <Button size="sm" onClick={() => onPagar(c)} className="gap-1 h-7 text-xs">
            <CheckCircle className="w-3 h-3" /> Pagar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onCancelar(c)} className="h-7 text-xs text-muted-foreground hover:text-destructive">
            <XCircle className="w-3 h-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
});

export default function ContasAPagarPage() {
  const { user } = useAuth();
  const [allContas, setAllContas] = useState<ContaPagar[]>([]);
  const [comprasRaw, setComprasRaw] = useState<Array<{ id: string; valor_total: number | string | null; status_entrega: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [filterVencimento, setFilterVencimento] = useState<"todos" | "hoje" | "vencidas" | "semana">("todos");
  const [page, setPage] = useState(0);

  // Payment dialog
  const [pagamentoTarget, setPagamentoTarget] = useState<ContaPagar | null>(null);
  const [pagamentoOpen, setPagamentoOpen] = useState(false);

  // Cancel dialog
  const [cancelTarget, setCancelTarget] = useState<ContaPagar | null>(null);

  const today = todayLocalISO();

  const fetchData = useCallback(async () => {
    const [fluxoRes, comprasRes] = await Promise.all([
      supabase
        .from("obra_transacoes_fluxo")
        .select("id, tipo, valor, data, data_vencimento, categoria, descricao, forma_pagamento, observacoes, conta_id, status, parcela_numero, parcela_total, recorrencia, recorrencia_grupo_id, created_at" as any)
        .is("deleted_at", null)
        .eq("status" as any, "pendente")
        .eq("tipo", "Saída"),
      supabase
        .from("obra_compras")
        .select("id, fornecedor, descricao, categoria, conta_id, parcelas, status_entrega, valor_total, numero_parcelas")
        .is("deleted_at", null)
        .neq("status_entrega", "Cancelado"),
    ]);

    const fluxoRows: ContaPagar[] = ((fluxoRes.data as any) ?? []).map((r: any) => ({ ...r, origem: "fluxo" as const }));
    const comprasData = (comprasRes.data ?? []) as any[];
    const parcelaRows: ContaPagar[] = flattenParcelasPendentes((comprasData as unknown) as CompraComParcelas[])
      .map((p: ParcelaPendenteRow) => ({ ...p }));

    const merged = [...fluxoRows, ...parcelaRows].sort((a, b) => {
      const av = a.data_vencimento || "9999-12-31";
      const bv = b.data_vencimento || "9999-12-31";
      return av.localeCompare(bv);
    });

    setAllContas(merged);
    setComprasRaw(comprasData.map((c) => ({ id: c.id, valor_total: c.valor_total, status_entrega: c.status_entrega })));
    setLoading(false);
  }, []);

  // Process recurring transactions on mount (once)
  const recurrenceRan = useRef(false);
  useEffect(() => {
    if (!recurrenceRan.current) {
      recurrenceRan.current = true;
      processRecurrences().then((n) => {
        if (n > 0) fetchData();
      });
    }
  }, [fetchData]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const onFocus = () => fetchData();
    window.addEventListener("focus", onFocus);
    return () => { window.removeEventListener("focus", onFocus); };
  }, [fetchData]);
  useRealtimeSubscription("obra_transacoes_fluxo", fetchData);
  useRealtimeSubscription("obra_compras", fetchData);

  // Filtros + busca em memória
  const filtered = useMemo(() => {
    const semana = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    const q = debouncedSearch.trim().toLowerCase();
    return allContas.filter((c) => {
      if (q) {
        const hay = `${c.descricao} ${c.categoria}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filterVencimento === "hoje" && c.data_vencimento !== today) return false;
      if (filterVencimento === "vencidas" && !(c.data_vencimento && c.data_vencimento < today)) return false;
      if (filterVencimento === "semana" && !(c.data_vencimento && c.data_vencimento <= semana)) return false;
      return true;
    });
  }, [allContas, debouncedSearch, filterVencimento, today]);

  // KPIs sobre TUDO (não filtrado), seguindo comportamento anterior
  const kpis = useMemo(() => {
    const fluxoPendente = allContas
      .filter((r) => r.origem !== "compra-parcela")
      .reduce((s, r) => s + Number(r.valor), 0);
    const comprasTotal = comprasRaw.reduce((s, c) => s + Number(c.valor_total || 0), 0);
    const totalPendente = fluxoPendente + comprasTotal;
    const countFluxo = allContas.filter((r) => r.origem !== "compra-parcela").length;
    const countCompras = comprasRaw.length;

    const vencidas = allContas.filter(r => r.data_vencimento && r.data_vencimento < today);
    const totalVencidas = vencidas.reduce((s, r) => s + Number(r.valor), 0);
    const countHoje = allContas.filter(r => r.data_vencimento === today).length;
    const semana = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    const proximos7 = allContas.filter(r => r.data_vencimento && r.data_vencimento >= today && r.data_vencimento <= semana)
      .reduce((s, r) => s + Number(r.valor), 0);
    return { totalPendente, countFluxo, countCompras, totalVencidas, countVencidas: vencidas.length, countHoje, proximos7 };
  }, [allContas, comprasRaw, today]);

  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => { setPage(0); }, [debouncedSearch, filterVencimento]);

  const handlePagar = useCallback((conta: ContaPagar) => {
    setPagamentoTarget(conta);
    setPagamentoOpen(true);
  }, []);

  const handleCancelarClick = useCallback((conta: ContaPagar) => {
    setCancelTarget(conta);
  }, []);

  const handleCancelar = async () => {
    if (!cancelTarget) return;
    if (cancelTarget.origem === "compra-parcela" && cancelTarget.compra_id && cancelTarget.numero_parcela) {
      // Marca a parcela como Cancelada dentro do JSONB
      const { data: compra, error: e1 } = await supabase
        .from("obra_compras")
        .select("parcelas")
        .eq("id", cancelTarget.compra_id)
        .maybeSingle();
      if (e1 || !compra) {
        setCancelTarget(null);
        toast.error("Erro ao localizar compra");
        return;
      }
      const parcelas = Array.isArray((compra as any).parcelas) ? (compra as any).parcelas : [];
      const novas = parcelas.map((p: any) =>
        Number(p?.numero) === cancelTarget.numero_parcela ? { ...p, status: "Cancelada" } : p
      );
      const { error } = await supabase
        .from("obra_compras")
        .update({ parcelas: novas } as any)
        .eq("id", cancelTarget.compra_id);
      setCancelTarget(null);
      if (error) toast.error("Erro ao cancelar parcela");
      else { toast.success("Parcela cancelada"); fetchData(); }
      return;
    }

    const { error } = await supabase
      .from("obra_transacoes_fluxo")
      .update({ status: "cancelado" } as any)
      .eq("id", cancelTarget.id);
    setCancelTarget(null);
    if (error) {
      toast.error("Erro ao cancelar");
    } else {
      toast.success("Lançamento cancelado");
      fetchData();
    }
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="page-header">
        <h1 className="text-2xl font-bold">Contas a Pagar</h1>
        <p className="text-sm text-muted-foreground">Lançamentos pendentes do fluxo + parcelas em aberto de compras</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { cls: "stat-card-warning", icon: <Clock className="w-4 h-4 text-warning" />, label: "Total Pendente", value: formatCurrency(kpis.totalPendente), sub: `${kpis.countFluxo} lançamento(s) + ${kpis.countCompras} compra(s)` },
          { cls: "stat-card-danger", icon: <AlertTriangle className="w-4 h-4 text-destructive" />, label: "Vencidas", value: formatCurrency(kpis.totalVencidas), sub: `${kpis.countVencidas} vencida(s)`, color: "text-destructive" },
          { cls: "stat-card-info", icon: <CalendarCheck className="w-4 h-4 text-info" />, label: "Vencem Hoje", value: String(kpis.countHoje), sub: "pagamento(s)" },
          { cls: "stat-card-primary", icon: <DollarSign className="w-4 h-4 text-primary" />, label: "Próximos 7 dias", value: formatCurrency(kpis.proximos7), sub: "a vencer" },
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
            placeholder="Buscar por descrição ou categoria..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1">
          {(["todos", "hoje", "vencidas", "semana"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterVencimento(f)}
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
        ) : pageItems.length === 0 ? (
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
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Descrição</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Categoria</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Parcela</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Valor</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((c, i) => (
                  <ContaRow
                    key={c.id}
                    conta={c}
                    index={i}
                    today={today}
                    onPagar={handlePagar}
                    onCancelar={handleCancelarClick}
                  />
                ))}
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
          transacao={{
            id: pagamentoTarget.id,
            descricao: pagamentoTarget.descricao,
            valor: pagamentoTarget.valor,
            categoria: pagamentoTarget.categoria,
            data_vencimento: pagamentoTarget.data_vencimento ?? undefined,
            conta_id: pagamentoTarget.conta_id,
            forma_pagamento: pagamentoTarget.forma_pagamento,
            parcela_numero: pagamentoTarget.parcela_numero ?? undefined,
            parcela_total: pagamentoTarget.parcela_total ?? undefined,
          }}
          parcelaCompra={pagamentoTarget.origem === "compra-parcela" ? {
            compra_id: pagamentoTarget.compra_id!,
            numero_parcela: pagamentoTarget.numero_parcela!,
          } : undefined}
          userId={user.id}
        />
      )}

      {/* Cancel Dialog */}
      <ConfirmDialog
        open={!!cancelTarget}
        title={cancelTarget?.origem === "compra-parcela" ? "Cancelar Parcela" : "Cancelar Lançamento"}
        message={`Deseja cancelar "${cancelTarget?.descricao || ""}" de ${cancelTarget ? formatCurrency(Number(cancelTarget.valor)) : ""}?`}
        confirmLabel={cancelTarget?.origem === "compra-parcela" ? "Cancelar Parcela" : "Cancelar Lançamento"}
        variant="danger"
        onConfirm={handleCancelar}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
