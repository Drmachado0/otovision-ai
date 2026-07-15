import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, Upload, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  FolhaItem, FolhaEncargo,
  calcularTotaisFolha, competenciaLabel,
} from "@/lib/folhaPagamento";
import { FolhaRow } from "./maoObraFolhas/types";
import { FolhaCard } from "./maoObraFolhas/FolhaCard";
import { ImportarFolhaDialog } from "./maoObraFolhas/ImportarFolhaDialog";
import { FolhaEditorSheet } from "./maoObraFolhas/FolhaEditorSheet";
import { recalcularFolhaDB, upsertTrabalhadores } from "./maoObraFolhas/helpers";

// re-export para compatibilidade
export { recalcularFolhaDB };

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
  const queryClient = useQueryClient();
  const [openEditor, setOpenEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openImport, setOpenImport] = useState(false);
  const [openNew, setOpenNew] = useState(false);
  const [novaComp, setNovaComp] = useState(compAtualISO());

  const { data: folhasData, isLoading: loading, isError } = useQuery({
    queryKey: ["folhas-pagamento", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const res = await (supabase as any)
        .from("obra_folhas_pagamento")
        .select("*")
        .is("deleted_at", null)
        .order("competencia_mes", { ascending: false });
      if (res.error) throw res.error;
      return (res.data ?? []) as FolhaRow[];
    },
  });
  const folhas = folhasData ?? [];

  const fetchFolhas = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["folhas-pagamento", user?.id] });
  }, [queryClient, user?.id]);

  useEffect(() => {
    if (isError) toast.error("Erro ao carregar folhas");
  }, [isError]);

  const handleSelectFolha = useCallback((id: string) => {
    setEditingId(id);
    setOpenEditor(true);
  }, []);

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
            <FolhaCard key={f.id} folha={f} onSelect={handleSelectFolha} />
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
