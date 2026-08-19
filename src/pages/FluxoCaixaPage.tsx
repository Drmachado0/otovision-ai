import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import TransacaoDetailDrawer, { type TransacaoFull } from "@/components/TransacaoDetailDrawer";
import { fetchSaldoInicialTotal } from "@/lib/saldoInicial";
import { PAGE_SIZE, makeEmptyForm } from "./fluxoCaixa/types";
import { TransacaoRowItem } from "./fluxoCaixa/TransacaoRowItem";
import { FluxoCaixaKPIs } from "./fluxoCaixa/FluxoCaixaKPIs";
import { FluxoCaixaFilters } from "./fluxoCaixa/FluxoCaixaFilters";
import { NovaTransacaoDialog } from "./fluxoCaixa/NovaTransacaoDialog";
import BankStatementImportCard from "@/components/BankStatementImportCard";

export default function FluxoCaixaPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [filterCategoria, setFilterCategoria] = useState<string>("todos");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);

  const [selectedTransacao, setSelectedTransacao] = useState<TransacaoFull | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [contas, setContas] = useState<{ id: string; nome: string }[]>([]);

  const [valorError, setValorError] = useState("");

  const [filterStatus, setFilterStatus] = useState("todos");

  const [form, setForm] = useState(makeEmptyForm);

  const { data: fluxoData, isLoading: loading, isError } = useQuery({
    queryKey: ["fluxo-caixa", user?.id, page, filterTipo, filterCategoria, filterStatus, dateFrom, dateTo, debouncedSearch],
    enabled: !!user,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      // BUG-006: Totais incluem pagas + pendentes (excluindo canceladas)
      const totalsQuery = supabase
        .from("obra_transacoes_fluxo")
        .select("tipo, valor, status" as any)
        .is("deleted_at", null)
        .neq("status" as any, "cancelado");

      let query = supabase
        .from("obra_transacoes_fluxo")
        .select("id, tipo, valor, data, data_vencimento, categoria, descricao, forma_pagamento, observacoes, origem_tipo, conciliado, recorrencia, conta_id, referencia, created_at, status, parcela_numero, parcela_total" as any, { count: "exact" })
        .is("deleted_at", null)
        .order("data", { ascending: false });

      if (filterTipo !== "todos") query = query.eq("tipo", filterTipo);
      if (filterCategoria !== "todos") query = query.eq("categoria", filterCategoria);
      if (filterStatus !== "todos") query = query.eq("status" as any, filterStatus);
      if (dateFrom) query = query.gte("data", dateFrom);
      if (dateTo) query = query.lte("data", dateTo);
      if (debouncedSearch) query = query.or(`descricao.ilike.%${debouncedSearch}%,categoria.ilike.%${debouncedSearch}%`);

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const [{ data, count, error }, { data: allData, error: totalsError }, saldoBase] = await Promise.all([
        query,
        totalsQuery,
        fetchSaldoInicialTotal(),
      ]);
      if (error) throw error;
      if (totalsError) throw totalsError;

      const rows = (allData ?? []) as unknown as { tipo: string; valor: number; status?: string }[];
      const saidas = rows.filter(t => t.tipo === "Saída");
      const entradasOp = rows.filter(t => t.tipo === "Entrada").reduce((s, t) => s + Number(t.valor), 0);

      return {
        transacoes: (data as unknown as TransacaoFull[]) ?? [],
        totalCount: count ?? 0,
        entradasOperacionais: entradasOp,
        saldoInicial: saldoBase,
        // Entradas exibidas = saldo inicial das contas ativas + entradas registradas
        totalEntradas: saldoBase + entradasOp,
        totalSaidas: saidas.reduce((s, t) => s + Number(t.valor), 0),
        saidasPagas: saidas.filter(t => t.status === "pago").reduce((s, t) => s + Number(t.valor), 0),
        saidasPendentes: saidas.filter(t => t.status === "pendente" || !t.status).reduce((s, t) => s + Number(t.valor), 0),
      };
    },
  });

  const transacoes = fluxoData?.transacoes ?? [];
  const totalCount = fluxoData?.totalCount ?? 0;
  const totalEntradas = fluxoData?.totalEntradas ?? 0;
  const totalSaidas = fluxoData?.totalSaidas ?? 0;
  const saidasPagas = fluxoData?.saidasPagas ?? 0;
  const saidasPendentes = fluxoData?.saidasPendentes ?? 0;
  const saldoInicial = fluxoData?.saldoInicial ?? 0;
  const entradasOperacionais = fluxoData?.entradasOperacionais ?? 0;

  const fetchData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["fluxo-caixa", user?.id] });
  }, [queryClient, user?.id]);

  useEffect(() => {
    if (isError) toast.error("Erro ao carregar o fluxo de caixa. Tentando novamente...");
  }, [isError]);

  // BUG-001 fix: sync selectedTransacao with fresh data
  useEffect(() => {
    if (selectedTransacao) {
      const updated = transacoes.find(t => t.id === selectedTransacao.id);
      if (updated) setSelectedTransacao(updated);
    }
  }, [transacoes]);
  useEffect(() => {
    supabase.from("obra_contas_financeiras").select("id, nome").eq("ativa", true).then(({ data }) => {
      if (data) {
        setContas(data);
        // Auto-selecionar a primeira conta se houver apenas uma, ou se nenhuma foi selecionada
        if (data.length === 1) {
          setForm(f => ({ ...f, conta_id: data[0].id }));
        }
      }
    });
  }, []);
  useRealtimeSubscription("obra_transacoes_fluxo", fetchData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numVal = Number(form.valor);
    if (!form.valor || isNaN(numVal) || numVal <= 0) {
      setValorError("Informe um valor maior que zero");
      toast.error("Informe um valor válido");
      return;
    }
    // Entradas precisam de conta; Saidas pendentes nao (conta sera escolhida no pagamento)
    const isEntrada = form.tipo === "Entrada";
    if (isEntrada && contas.length > 0 && !form.conta_id) {
      toast.error("Selecione uma conta");
      return;
    }
    setValorError("");
    setSaving(true);

    const isSaida = form.tipo === "Saída";
    const statusBase = isSaida ? "pendente" : "pago";
    const grupoId = (form.recorrencia_tipo !== "Única") ? crypto.randomUUID() : null;

    try {
      if (form.recorrencia_tipo === "Parcelada" && isSaida) {
        // Gerar N parcelas
        const nParcelas = Math.max(1, parseInt(form.numero_parcelas) || 3);
        const valorParcela = Math.round((numVal / nParcelas) * 100) / 100;
        const parcelas = [];
        for (let i = 0; i < nParcelas; i++) {
          const venc = new Date(form.data_vencimento);
          venc.setMonth(venc.getMonth() + i);
          parcelas.push({
            user_id: user!.id,
            tipo: form.tipo,
            valor: i === nParcelas - 1 ? numVal - valorParcela * (nParcelas - 1) : valorParcela,
            data: form.data,
            data_vencimento: venc.toISOString().split("T")[0],
            categoria: form.categoria,
            descricao: form.descricao,
            forma_pagamento: form.forma_pagamento,
            observacoes: form.observacoes,
            recorrencia: "Parcelada",
            recorrencia_grupo_id: grupoId,
            parcela_numero: i + 1,
            parcela_total: nParcelas,
            referencia: "",
            conta_id: form.conta_id || null,
            status: "pendente",
          });
        }
        const { error } = await supabase.from("obra_transacoes_fluxo").insert(parcelas as any);
        if (error) throw error;
        toast.success(`${nParcelas} parcelas criadas!`);
      } else if (form.recorrencia_tipo === "Recorrente" && isSaida) {
        // Criar transacao mae recorrente
        const { error } = await supabase.from("obra_transacoes_fluxo").insert({
          user_id: user!.id,
          tipo: form.tipo,
          valor: numVal,
          data: form.data,
          data_vencimento: form.data_vencimento,
          categoria: form.categoria,
          descricao: form.descricao,
          forma_pagamento: form.forma_pagamento,
          observacoes: form.observacoes,
          recorrencia: form.periodicidade,
          recorrencia_ativa: true,
          recorrencia_mae: true,
          recorrencia_grupo_id: grupoId,
          recorrencia_frequencia: form.periodicidade,
          recorrencia_ocorrencias_criadas: 1,
          referencia: "",
          conta_id: form.conta_id || null,
          status: "pendente",
        } as any);
        if (error) throw error;
        toast.success("Lançamento recorrente criado!");
      } else {
        // Unica
        const { error } = await supabase.from("obra_transacoes_fluxo").insert({
          user_id: user!.id,
          tipo: form.tipo,
          valor: numVal,
          data: form.data,
          data_vencimento: isSaida ? form.data_vencimento : null,
          categoria: form.categoria,
          descricao: form.descricao,
          forma_pagamento: form.forma_pagamento,
          observacoes: form.observacoes,
          recorrencia: "Única",
          referencia: "",
          conta_id: isEntrada ? form.conta_id : (form.conta_id || null),
          status: statusBase,
          data_pagamento: isEntrada ? new Date().toISOString() : null,
        } as any);
        if (error) throw error;
        toast.success(isSaida ? "Lançamento criado! Confirme o pagamento em Contas a Pagar." : "Entrada registrada!");
      }
      setShowForm(false);
      setForm(makeEmptyForm());
      fetchData();
    } catch (err: unknown) {
      toast.error("Erro ao salvar: " + (err?.message || "Erro desconhecido"));
    }
    setSaving(false);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const openDetail = useCallback((t: TransacaoFull) => {
    setSelectedTransacao(t);
    setDrawerOpen(true);
  }, []);

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="text-2xl font-bold">Fluxo de Caixa</h1>
          <p className="text-sm text-muted-foreground">Entradas e saídas financeiras</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nova Transação
        </Button>
      </div>

      <BankStatementImportCard contas={contas} onImported={fetchData} />

      {/* Summary */}
      <FluxoCaixaKPIs
        totalEntradas={totalEntradas}
        totalSaidas={totalSaidas}
        saidasPagas={saidasPagas}
        saidasPendentes={saidasPendentes}
        saldoInicial={saldoInicial}
        entradasOperacionais={entradasOperacionais}
      />

      {/* Filters + Date range */}
      <FluxoCaixaFilters
        search={search}
        setSearch={setSearch}
        filterTipo={filterTipo}
        setFilterTipo={setFilterTipo}
        filterCategoria={filterCategoria}
        setFilterCategoria={setFilterCategoria}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        setPage={setPage}
      />

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transacoes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Nenhuma transação encontrada</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Data</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Descrição</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Categoria</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Pagamento</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Origem</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Valor</th>
                </tr>
              </thead>
              <tbody>
                {transacoes.map((t) => (
                  <TransacaoRowItem key={t.id} transacao={t} onOpenDetail={openDetail} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
            <span className="text-xs text-muted-foreground">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount}
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

      {/* Detail Drawer */}
      <TransacaoDetailDrawer
        transacao={selectedTransacao}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onUpdated={fetchData}
      />

      {/* New Transaction Dialog */}
      <NovaTransacaoDialog
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          // UX-2: reset form ao fechar para evitar estado antigo ao reabrir
          if (!open) { setForm(makeEmptyForm()); setValorError(""); }
        }}
        form={form}
        setForm={setForm}
        valorError={valorError}
        setValorError={setValorError}
        saving={saving}
        contas={contas}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
