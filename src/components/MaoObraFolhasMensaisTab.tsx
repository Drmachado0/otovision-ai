import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, Upload, Trash2, FileText, CheckCircle2, RotateCcw, Send, Wallet, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { formatCurrency } from "@/lib/formatters";
import {
  FolhaItem, FolhaEncargo, FolhaStatus,
  calcularTotaisFolha, calcularTotaisItem, validarFolha,
  competenciaLabel, referenciaFolha, parseFolhaJson, normalizarCpf,
} from "@/lib/folhaPagamento";

interface FolhaRow {
  id: string;
  competencia_mes: string;
  titulo: string;
  obra_nome: string;
  data_fechamento: string;
  status: FolhaStatus;
  total_funcionarios: number;
  total_encargos: number;
  total_geral: number;
  diferenca_conferencia: number;
  financeiro_transacao_id: string | null;
  comissao_id: string | null;
  gerar_comissao: boolean;
  origem: string;
  observacoes: string;
}

const STATUS_COLORS: Record<FolhaStatus, string> = {
  rascunho: "bg-muted text-muted-foreground",
  conferida: "bg-info/15 text-info",
  lancada: "bg-warning/15 text-warning",
  paga: "bg-success/15 text-success",
  cancelada: "bg-destructive/15 text-destructive",
};

function compAtualISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ultimoDiaMes(comp: string): string {
  const [y, m] = comp.split("-").map(Number);
  const d = new Date(y, m, 0);
  return `${y}-${String(m).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function MaoObraFolhasMensaisTab() {
  const { user } = useAuth();
  const [folhas, setFolhas] = useState<FolhaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openEditor, setOpenEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openImport, setOpenImport] = useState(false);
  const [openNew, setOpenNew] = useState(false);
  const [novaComp, setNovaComp] = useState(compAtualISO());

  const fetchFolhas = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("obra_folhas_pagamento")
      .select("*")
      .is("deleted_at", null)
      .order("competencia_mes", { ascending: false });
    if (error) toast.error("Erro ao carregar folhas");
    setFolhas(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchFolhas(); }, [fetchFolhas]);

  const [recalculando, setRecalculando] = useState(false);

  const recalcularTodas = async () => {
    if (!folhas.length) return;
    setRecalculando(true);
    let ok = 0; let fail = 0;
    for (const f of folhas) {
      try {
        await recalcularFolhaDB(f.id);
        ok++;
      } catch { fail++; }
    }
    setRecalculando(false);
    if (fail) toast.warning(`Recalculadas ${ok} folhas, ${fail} com erro`);
    else toast.success(`Totais atualizados em ${ok} folha(s)`);
    fetchFolhas();
  };

  const criarFolha = async (params: {
    competencia: string;
    titulo?: string;
    obra_nome?: string;
    data_fechamento?: string;
    observacoes?: string;
    itens?: FolhaItem[];
    encargos?: FolhaEncargo[];
    origem?: string;
    total_informado?: number;
  }) => {
    if (!user) return;
    const itens = params.itens ?? [];
    const encargos = params.encargos ?? [];
    const totais = calcularTotaisFolha(itens, encargos);
    const diff = params.total_informado != null
      ? +(params.total_informado - totais.total_geral).toFixed(2) : 0;

    const { data, error } = await (supabase as any)
      .from("obra_folhas_pagamento")
      .insert({
        user_id: user.id,
        competencia_mes: params.competencia,
        titulo: params.titulo ?? `Folha de pagamento ${competenciaLabel(params.competencia)}`,
        obra_nome: params.obra_nome ?? "",
        data_fechamento: params.data_fechamento ?? ultimoDiaMes(params.competencia),
        status: "rascunho",
        ...totais,
        diferenca_conferencia: diff,
        origem: params.origem ?? "manual",
        observacoes: params.observacoes ?? "",
      })
      .select("id")
      .single();

    if (error || !data) {
      toast.error("Erro ao criar folha: " + (error?.message ?? ""));
      return null;
    }

    const folhaId = data.id as string;

    if (itens.length) {
      const payload = itens.map((i) => ({
        user_id: user.id, folha_id: folhaId,
        ref: i.ref, nome: i.nome, cpf: i.cpf, funcao: i.funcao,
        qtd_diaria: i.qtd_diaria, valor_diaria: i.valor_diaria, total_diarias: i.total_diarias,
        quinzena: i.quinzena, vales: i.vales, alimentacao: i.alimentacao,
        encerramento: i.encerramento, ferias_13: i.ferias_13, horas_extras: i.horas_extras,
        total_geral: i.total_geral, observacoes: i.observacoes ?? "",
      }));
      const { error: e2 } = await (supabase as any).from("obra_folha_pagamento_itens").insert(payload);
      if (e2) toast.error("Erro ao salvar itens: " + e2.message);

      // upsert trabalhadores
      await upsertTrabalhadores(user.id, itens);
    }

    if (encargos.length) {
      const payload = encargos.map((e) => ({
        user_id: user.id, folha_id: folhaId,
        tipo: e.tipo, descricao: e.descricao, valor: e.valor, observacoes: e.observacoes ?? "",
      }));
      const { error: e3 } = await (supabase as any).from("obra_folha_pagamento_encargos").insert(payload);
      if (e3) toast.error("Erro ao salvar encargos: " + e3.message);
    }

    toast.success("Folha criada");
    fetchFolhas();
    setEditingId(folhaId);
    setOpenEditor(true);
    return folhaId;
  };

  const handleNovaFolha = async () => {
    if (folhas.some((f) => f.competencia_mes === novaComp && f.status !== "cancelada")) {
      toast.error("Já existe folha ativa para essa competência");
      return;
    }
    setOpenNew(false);
    await criarFolha({ competencia: novaComp });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Folhas mensais</h2>
          <p className="text-xs text-muted-foreground">
            Detalhe a folha por competência e gere apenas um lançamento consolidado no fluxo de caixa.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={recalcularTodas} disabled={recalculando || !folhas.length} className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${recalculando ? "animate-spin" : ""}`} />
            {recalculando ? "Recalculando..." : "Recalcular"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setOpenImport(true)} className="gap-1.5">
            <Upload className="w-4 h-4" /> Importar folha
          </Button>
          <Button size="sm" onClick={() => setOpenNew(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Nova folha
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : folhas.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhuma folha cadastrada ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {folhas.map((f) => (
            <button
              key={f.id}
              onClick={() => { setEditingId(f.id); setOpenEditor(true); }}
              className="glass-card p-4 text-left hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold">{competenciaLabel(f.competencia_mes)}</p>
                  <p className="text-xs text-muted-foreground">{referenciaFolha(f.competencia_mes)}</p>
                </div>
                <Badge className={STATUS_COLORS[f.status]}>{f.status}</Badge>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(Number(f.total_geral))}</p>
              <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                <div>Funcionários: {formatCurrency(Number(f.total_funcionarios))}</div>
                <div>Encargos: {formatCurrency(Number(f.total_encargos))}</div>
                {Math.abs(Number(f.diferenca_conferencia)) > 0.5 && (
                  <div className="text-warning">Diferença: {formatCurrency(Number(f.diferenca_conferencia))}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* New folha dialog */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="glass-card sm:max-w-sm">
          <DialogHeader><DialogTitle>Nova folha</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Competência (YYYY-MM)</Label>
            <Input type="month" value={novaComp} onChange={(e) => setNovaComp(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
            <Button onClick={handleNovaFolha}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportarFolhaDialog
        open={openImport}
        onOpenChange={setOpenImport}
        onParsed={async (parsed) => {
          if (folhas.some((f) => f.competencia_mes === parsed.competencia && f.status !== "cancelada")) {
            toast.error("Já existe folha ativa para essa competência");
            return;
          }
          setOpenImport(false);
          await criarFolha({
            competencia: parsed.competencia,
            titulo: parsed.titulo,
            obra_nome: parsed.obra_nome,
            data_fechamento: parsed.data_fechamento,
            observacoes: parsed.observacoes,
            itens: parsed.itens,
            encargos: parsed.encargos,
            origem: "hermes",
            total_informado: parsed.total_informado,
          });
        }}
      />

      {editingId && (
        <FolhaEditorSheet
          folhaId={editingId}
          open={openEditor}
          onOpenChange={(v) => { setOpenEditor(v); if (!v) { setEditingId(null); fetchFolhas(); } }}
        />
      )}
    </div>
  );
}

// ============================== IMPORT DIALOG ==============================

function ImportarFolhaDialog({
  open, onOpenChange, onParsed,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onParsed: (p: ReturnType<typeof parseFolhaJson>) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleParse = () => {
    setError(null);
    try {
      const json = JSON.parse(text);
      const parsed = parseFolhaJson(json);
      onParsed(parsed);
      setText("");
    } catch (e: any) {
      setError(e?.message ?? "JSON inválido");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-2xl">
        <DialogHeader><DialogTitle>Importar folha (JSON)</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>Cole o JSON gerado pela IA/Hermes</Label>
          <textarea
            className="w-full h-72 rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='{ "competencia": "2026-04", "funcionarios": [...], "encargos": [...] }'
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleParse}>Importar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================== EDITOR ==============================

function FolhaEditorSheet({
  folhaId, open, onOpenChange,
}: { folhaId: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const [folha, setFolha] = useState<FolhaRow | null>(null);
  const [itens, setItens] = useState<FolhaItem[]>([]);
  const [encargos, setEncargos] = useState<FolhaEncargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: f }, { data: is }, { data: es }] = await Promise.all([
      (supabase as any).from("obra_folhas_pagamento").select("*").eq("id", folhaId).maybeSingle(),
      (supabase as any).from("obra_folha_pagamento_itens").select("*").eq("folha_id", folhaId).is("deleted_at", null).order("ref"),
      (supabase as any).from("obra_folha_pagamento_encargos").select("*").eq("folha_id", folhaId).is("deleted_at", null),
    ]);
    setFolha(f ?? null);
    setItens((is ?? []).map((i: any) => calcularTotaisItem(i)));
    setEncargos(es ?? []);
    setLoading(false);
  }, [folhaId]);

  useEffect(() => { if (open) fetchAll(); }, [open, fetchAll]);

  const totais = useMemo(() => calcularTotaisFolha(itens, encargos), [itens, encargos]);
  const validacao = useMemo(
    () => validarFolha(itens, encargos, folha?.diferenca_conferencia ? totais.total_geral + Number(folha.diferenca_conferencia) : undefined),
    [itens, encargos, folha, totais.total_geral],
  );

  const readonly = folha?.status === "paga" || folha?.status === "cancelada";

  const updateItem = (idx: number, patch: Partial<FolhaItem>) => {
    setItens((prev) => prev.map((it, i) => i === idx ? calcularTotaisItem({ ...it, ...patch }) : it));
  };

  const addItem = () => {
    setItens((prev) => [...prev, calcularTotaisItem({
      ref: prev.length + 1, nome: "", cpf: "", funcao: "",
      qtd_diaria: 0, valor_diaria: 0, quinzena: 0, vales: 0, alimentacao: 0,
      encerramento: 0, ferias_13: 0, horas_extras: 0,
    })]);
  };

  const removeItem = (idx: number) => setItens((prev) => prev.filter((_, i) => i !== idx));
  const addEncargo = () => setEncargos((prev) => [...prev, { tipo: "outros", descricao: "", valor: 0 }]);
  const updateEncargo = (idx: number, patch: Partial<FolhaEncargo>) =>
    setEncargos((prev) => prev.map((e, i) => i === idx ? { ...e, ...patch } : e));
  const removeEncargo = (idx: number) => setEncargos((prev) => prev.filter((_, i) => i !== idx));

  const salvar = async () => {
    if (!folha || !user) return;
    setSaving(true);
    try {
      // delete + reinsert itens/encargos (soft delete)
      await (supabase as any).from("obra_folha_pagamento_itens").delete().eq("folha_id", folha.id);
      await (supabase as any).from("obra_folha_pagamento_encargos").delete().eq("folha_id", folha.id);

      if (itens.length) {
        await (supabase as any).from("obra_folha_pagamento_itens").insert(
          itens.map((i) => ({
            user_id: user.id, folha_id: folha.id,
            ref: i.ref, nome: i.nome, cpf: i.cpf, funcao: i.funcao,
            qtd_diaria: i.qtd_diaria, valor_diaria: i.valor_diaria, total_diarias: i.total_diarias,
            quinzena: i.quinzena, vales: i.vales, alimentacao: i.alimentacao,
            encerramento: i.encerramento, ferias_13: i.ferias_13, horas_extras: i.horas_extras,
            total_geral: i.total_geral, observacoes: i.observacoes ?? "",
          })),
        );
        await upsertTrabalhadores(user.id, itens);
      }
      if (encargos.length) {
        await (supabase as any).from("obra_folha_pagamento_encargos").insert(
          encargos.map((e) => ({
            user_id: user.id, folha_id: folha.id,
            tipo: e.tipo, descricao: e.descricao, valor: e.valor, observacoes: e.observacoes ?? "",
          })),
        );
      }

      const t = calcularTotaisFolha(itens, encargos);
      await (supabase as any).from("obra_folhas_pagamento").update({
        titulo: folha.titulo, obra_nome: folha.obra_nome,
        data_fechamento: folha.data_fechamento, observacoes: folha.observacoes,
        gerar_comissao: folha.gerar_comissao,
        ...t,
      }).eq("id", folha.id);

      toast.success("Folha salva");
      fetchAll();
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const marcarConferida = async () => {
    if (!folha) return;
    if (validacao.erros.length) {
      toast.error("Corrija os erros antes: " + validacao.erros[0]);
      return;
    }
    await salvar();
    await (supabase as any).from("obra_folhas_pagamento").update({ status: "conferida" }).eq("id", folha.id);
    toast.success("Folha marcada como conferida");
    fetchAll();
  };

  const lancarFinanceiro = async () => {
    if (!folha) return;
    if (validacao.erros.length) {
      toast.error("Corrija os erros antes de lançar");
      return;
    }
    await salvar();
    const { data, error } = await (supabase as any).rpc("lancar_folha_financeiro", { p_folha_id: folha.id });
    if (error) {
      toast.error("Erro ao lançar: " + error.message);
      return;
    }
    toast.success(`Despesa criada: ${data?.referencia ?? ""} — ${formatCurrency(totais.total_geral)}`);
    fetchAll();
  };

  const marcarPaga = async () => {
    if (!folha) return;
    const { error } = await (supabase as any).rpc("marcar_folha_paga", {
      p_folha_id: folha.id,
      p_data: new Date().toISOString().slice(0, 10),
      p_conta_id: null,
    });
    if (error) toast.error("Erro: " + error.message);
    else { toast.success("Folha marcada como paga"); fetchAll(); }
  };

  const reabrir = async () => {
    if (!folha) return;
    if (!confirm("Reabrir folha? A despesa pendente será removida.")) return;
    const { error } = await (supabase as any).rpc("reabrir_folha", { p_folha_id: folha.id });
    if (error) toast.error("Erro: " + error.message);
    else { toast.success("Folha reaberta"); fetchAll(); }
  };

  const cancelar = async () => {
    if (!folha) return;
    if (!confirm("Cancelar folha?")) return;
    await (supabase as any).from("obra_folhas_pagamento")
      .update({ status: "cancelada", deleted_at: new Date().toISOString() }).eq("id", folha.id);
    toast.success("Folha cancelada");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-6xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            {folha ? competenciaLabel(folha.competencia_mes) : "Folha"}
            {folha && <Badge className={STATUS_COLORS[folha.status]}>{folha.status}</Badge>}
            {folha?.origem && folha.origem !== "manual" && (
              <Badge variant="outline" className="text-xs">origem: {folha.origem}</Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {loading || !folha ? (
          <p className="text-sm text-muted-foreground mt-4">Carregando...</p>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Cabeçalho */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Título</Label>
                <Input disabled={readonly} value={folha.titulo}
                  onChange={(e) => setFolha({ ...folha, titulo: e.target.value })} />
              </div>
              <div>
                <Label>Obra</Label>
                <Input disabled={readonly} value={folha.obra_nome}
                  onChange={(e) => setFolha({ ...folha, obra_nome: e.target.value })} />
              </div>
              <div>
                <Label>Data fechamento</Label>
                <Input disabled={readonly} type="date" value={folha.data_fechamento}
                  onChange={(e) => setFolha({ ...folha, data_fechamento: e.target.value })} />
              </div>
            </div>

            {/* Conferência */}
            <div className="glass-card p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
              <div><span className="text-xs text-muted-foreground">Funcionários</span>
                <p className="font-semibold">{itens.length}</p></div>
              <div><span className="text-xs text-muted-foreground">Bruto / Produção</span>
                <p className="font-semibold">{formatCurrency(totais.total_diarias + totais.total_alimentacao + totais.total_encerramento + totais.total_ferias_13 + totais.total_horas_extras)}</p></div>
              <div><span className="text-xs text-muted-foreground">(−) Vales</span>
                <p className="font-semibold text-destructive">−{formatCurrency(totais.total_vales)}</p></div>
              <div><span className="text-xs text-muted-foreground">(−) Quinzenas</span>
                <p className="font-semibold text-destructive">−{formatCurrency(totais.total_quinzena)}</p></div>
              <div><span className="text-xs text-muted-foreground">Líquido funcionários</span>
                <p className="font-semibold">{formatCurrency(totais.total_funcionarios)}</p></div>
              <div><span className="text-xs text-muted-foreground">Total líquido folha</span>
                <p className="font-bold text-primary text-lg">{formatCurrency(totais.total_geral)}</p>
                <span className="text-[10px] text-muted-foreground">inclui encargos {formatCurrency(totais.total_encargos)}</span></div>
            </div>

            {(validacao.erros.length > 0 || validacao.alertas.length > 0) && (
              <div className="glass-card p-3 space-y-1 text-xs">
                {validacao.erros.map((e, i) => <p key={`e${i}`} className="text-destructive">⛔ {e}</p>)}
                {validacao.alertas.map((a, i) => <p key={`a${i}`} className="text-warning">⚠ {a}</p>)}
              </div>
            )}

            {/* Itens */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Funcionários</h3>
                {!readonly && (
                  <Button size="sm" variant="outline" onClick={addItem} className="gap-1">
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </Button>
                )}
              </div>
              <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 mb-2 text-[11px] text-warning-foreground/80">
                💡 <strong>Vales</strong> e <strong>Quinzenas</strong> são adiantamentos: informe sempre como <strong>valor positivo</strong>. Eles são <strong>subtraídos</strong> do total bruto do funcionário (não somam ao líquido).
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-[10px] uppercase text-muted-foreground border-b">
                    <tr>
                      {["REF","Nome","CPF","Função","Qtd","V.Diária","T.Diárias","Quinz. (−)","Vales (−)","Alim.","Encerr.","Férias/13","HE","Total",""].map((h) => (
                        <th key={h} className="px-1 py-1.5 text-left whitespace-nowrap" title={h.includes("(−)") ? "Adiantamento: subtraído do total" : undefined}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((it, idx) => (
                      <tr key={idx} className="border-b border-border/30">
                        <td className="px-1 py-1"><MiniInput w={40} disabled={readonly} type="number" value={it.ref}
                          onChange={(v) => updateItem(idx, { ref: Number(v) })} /></td>
                        <td className="px-1 py-1"><MiniInput w={140} disabled={readonly} value={it.nome}
                          onChange={(v) => updateItem(idx, { nome: String(v) })} /></td>
                        <td className="px-1 py-1"><MiniInput w={100} disabled={readonly} value={it.cpf}
                          onChange={(v) => updateItem(idx, { cpf: String(v) })} /></td>
                        <td className="px-1 py-1"><MiniInput w={100} disabled={readonly} value={it.funcao}
                          onChange={(v) => updateItem(idx, { funcao: String(v) })} /></td>
                        <td className="px-1 py-1"><MiniInput w={56} disabled={readonly} type="number" value={it.qtd_diaria}
                          onChange={(v) => updateItem(idx, { qtd_diaria: Number(v) })} /></td>
                        <td className="px-1 py-1"><MiniInput w={70} disabled={readonly} type="number" value={it.valor_diaria}
                          onChange={(v) => updateItem(idx, { valor_diaria: Number(v) })} /></td>
                        <td className="px-1 py-1 text-right tabular-nums">{formatCurrency(it.total_diarias)}</td>
                        <td className="px-1 py-1"><MiniInput w={70} disabled={readonly} type="number" min={0} value={it.quinzena}
                          title="Adiantamento — informe positivo (será subtraído do total)"
                          onChange={(v) => {
                            const n = Number(v);
                            if (n < 0) toast.warning("Quinzena convertida para positivo (é descontada do total)");
                            updateItem(idx, { quinzena: Math.abs(n) });
                          }} /></td>
                        <td className="px-1 py-1"><MiniInput w={70} disabled={readonly} type="number" min={0} value={it.vales}
                          title="Adiantamento — informe positivo (será subtraído do total)"
                          onChange={(v) => {
                            const n = Number(v);
                            if (n < 0) toast.warning("Vales convertidos para positivo (são descontados do total)");
                            updateItem(idx, { vales: Math.abs(n) });
                          }} /></td>
                        <td className="px-1 py-1"><MiniInput w={70} disabled={readonly} type="number" value={it.alimentacao}
                          onChange={(v) => updateItem(idx, { alimentacao: Number(v) })} /></td>
                        <td className="px-1 py-1"><MiniInput w={70} disabled={readonly} type="number" value={it.encerramento}
                          onChange={(v) => updateItem(idx, { encerramento: Number(v) })} /></td>
                        <td className="px-1 py-1"><MiniInput w={70} disabled={readonly} type="number" value={it.ferias_13}
                          onChange={(v) => updateItem(idx, { ferias_13: Number(v) })} /></td>
                        <td className="px-1 py-1"><MiniInput w={70} disabled={readonly} type="number" value={it.horas_extras}
                          onChange={(v) => updateItem(idx, { horas_extras: Number(v) })} /></td>
                        <td className="px-1 py-1 text-right tabular-nums font-semibold">{formatCurrency(it.total_geral)}</td>
                        <td className="px-1 py-1">
                          {!readonly && (
                            <Button size="sm" variant="ghost" onClick={() => removeItem(idx)} className="h-6 w-6 p-0">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t font-semibold text-xs">
                    <tr>
                      <td colSpan={6} className="px-1 py-1.5 text-right">Totais:</td>
                      <td className="px-1 py-1.5 text-right tabular-nums">{formatCurrency(totais.total_diarias)}</td>
                      <td className="px-1 py-1.5 text-right tabular-nums">{formatCurrency(totais.total_quinzena)}</td>
                      <td className="px-1 py-1.5 text-right tabular-nums">{formatCurrency(totais.total_vales)}</td>
                      <td className="px-1 py-1.5 text-right tabular-nums">{formatCurrency(totais.total_alimentacao)}</td>
                      <td className="px-1 py-1.5 text-right tabular-nums">{formatCurrency(totais.total_encerramento)}</td>
                      <td className="px-1 py-1.5 text-right tabular-nums">{formatCurrency(totais.total_ferias_13)}</td>
                      <td className="px-1 py-1.5 text-right tabular-nums">{formatCurrency(totais.total_horas_extras)}</td>
                      <td className="px-1 py-1.5 text-right tabular-nums">{formatCurrency(totais.total_funcionarios)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Encargos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Encargos / custos do mês</h3>
                {!readonly && (
                  <Button size="sm" variant="outline" onClick={addEncargo} className="gap-1">
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </Button>
                )}
              </div>
              <div className="space-y-1.5">
                {encargos.map((e, idx) => (
                  <div key={idx} className="flex gap-2 items-center text-xs">
                    <select disabled={readonly} value={e.tipo}
                      onChange={(ev) => updateEncargo(idx, { tipo: ev.target.value as any })}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs w-40">
                      <option value="custos_engenharia">Custos engenharia</option>
                      <option value="exames">Exames</option>
                      <option value="fgts">FGTS</option>
                      <option value="inss">INSS</option>
                      <option value="outros">Outros</option>
                    </select>
                    <MiniInput w={260} disabled={readonly} value={e.descricao}
                      onChange={(v) => updateEncargo(idx, { descricao: String(v) })} placeholder="Descrição" />
                    <MiniInput w={110} disabled={readonly} type="number" value={e.valor}
                      onChange={(v) => updateEncargo(idx, { valor: Number(v) })} placeholder="Valor" />
                    {!readonly && (
                      <Button size="sm" variant="ghost" onClick={() => removeEncargo(idx)} className="h-7 w-7 p-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                {encargos.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum encargo lançado.</p>
                )}
              </div>
            </div>

            {/* Comissão */}
            <div className="flex items-center gap-3">
              <Switch checked={folha.gerar_comissao} disabled={readonly}
                onCheckedChange={(v) => setFolha({ ...folha, gerar_comissao: v })} />
              <span className="text-sm">Gerar comissão 8% ao lançar no financeiro
                ({formatCurrency(totais.total_geral * 0.08)})</span>
            </div>

            <div>
              <Label>Observações</Label>
              <Input disabled={readonly} value={folha.observacoes}
                onChange={(e) => setFolha({ ...folha, observacoes: e.target.value })} />
            </div>

            {/* Ações */}
            <div className="flex flex-wrap gap-2 pt-3 border-t">
              {(folha.status === "rascunho" || folha.status === "conferida") && (
                <>
                  <Button onClick={salvar} disabled={saving} variant="outline" className="gap-1.5">
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!folha) return;
                      setSaving(true);
                      try {
                        await salvar();
                        await recalcularFolhaDB(folha.id);
                        toast.success("Totais recalculados");
                        await fetchAll();
                      } catch (e: any) {
                        toast.error("Erro ao recalcular: " + e.message);
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                    variant="outline"
                    className="gap-1.5"
                  >
                    <RefreshCw className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} /> Recalcular
                  </Button>
                  {folha.status === "rascunho" && (
                    <Button onClick={marcarConferida} disabled={saving} variant="outline" className="gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Marcar conferida
                    </Button>
                  )}
                  <Button onClick={lancarFinanceiro} disabled={saving} className="gap-1.5">
                    <Send className="w-4 h-4" /> Lançar no Financeiro
                  </Button>
                  <Button onClick={cancelar} variant="ghost" className="gap-1.5 text-destructive">
                    <Trash2 className="w-4 h-4" /> Cancelar folha
                  </Button>
                </>
              )}
              {folha.status === "lancada" && (
                <>
                  <Button onClick={marcarPaga} className="gap-1.5">
                    <Wallet className="w-4 h-4" /> Marcar como paga
                  </Button>
                  <Button onClick={reabrir} variant="outline" className="gap-1.5">
                    <RotateCcw className="w-4 h-4" /> Reabrir
                  </Button>
                </>
              )}
              {folha.status === "paga" && (
                <p className="text-sm text-success">Folha quitada.</p>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MiniInput({
  value, onChange, type = "text", w, disabled, placeholder,
}: {
  value: string | number;
  onChange: (v: string | number) => void;
  type?: string;
  w?: number;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      disabled={disabled}
      placeholder={placeholder}
      style={{ width: w }}
      value={value as any}
      onChange={(e) => onChange(type === "number" ? Number(e.target.value) || 0 : e.target.value)}
      className="h-7 rounded border border-input bg-background px-1.5 text-xs disabled:opacity-60"
    />
  );
}

// ============================== HELPERS ==============================

async function upsertTrabalhadores(userId: string, itens: FolhaItem[]) {
  for (const it of itens) {
    if (!it.nome?.trim()) continue;
    const cpfNorm = normalizarCpf(it.cpf);
    let existing: any = null;
    if (cpfNorm) {
      const { data } = await (supabase as any)
        .from("obra_mao_de_obra")
        .select("id")
        .eq("user_id", userId)
        .eq("cpf_normalizado", cpfNorm)
        .is("deleted_at", null)
        .maybeSingle();
      existing = data;
    }
    if (!existing) {
      const { data } = await (supabase as any)
        .from("obra_mao_de_obra")
        .select("id")
        .eq("user_id", userId)
        .ilike("nome", it.nome.trim())
        .is("deleted_at", null)
        .maybeSingle();
      existing = data;
    }
    const payload: any = {
      nome: it.nome.trim(),
      funcao: it.funcao || "",
      valor_diaria: it.valor_diaria || 0,
      cpf: it.cpf || "",
      cpf_normalizado: cpfNorm || null,
    };
    if (existing) {
      await (supabase as any).from("obra_mao_de_obra").update(payload).eq("id", existing.id);
    } else {
      await (supabase as any).from("obra_mao_de_obra").insert({
        ...payload, user_id: userId, ativo: true, tipo_contrato: "Diária",
        aliquota_fgts: 8, aliquota_inss: 20, incide_encargos: false,
      });
    }
  }
}

export async function recalcularFolhaDB(folhaId: string): Promise<void> {
  const [{ data: is }, { data: es }] = await Promise.all([
    (supabase as any).from("obra_folha_pagamento_itens").select("*").eq("folha_id", folhaId).is("deleted_at", null),
    (supabase as any).from("obra_folha_pagamento_encargos").select("*").eq("folha_id", folhaId).is("deleted_at", null),
  ]);
  const itens: FolhaItem[] = (is ?? []).map((i: any) => calcularTotaisItem(i));
  const encargos: FolhaEncargo[] = es ?? [];

  // atualizar totais por item
  for (const it of itens) {
    if ((it as any).id) {
      await (supabase as any).from("obra_folha_pagamento_itens").update({
        total_diarias: it.total_diarias,
        total_geral: it.total_geral,
      }).eq("id", (it as any).id);
    }
  }

  const t = calcularTotaisFolha(itens, encargos);
  const { data: f } = await (supabase as any)
    .from("obra_folhas_pagamento").select("diferenca_conferencia").eq("id", folhaId).maybeSingle();
  const diff = f ? Number(f.diferenca_conferencia ?? 0) : 0;
  await (supabase as any).from("obra_folhas_pagamento").update({ ...t }).eq("id", folhaId);
  // mantém o "total_informado" implícito quando havia diferença? Mantém diff inalterado.
  void diff;
}

