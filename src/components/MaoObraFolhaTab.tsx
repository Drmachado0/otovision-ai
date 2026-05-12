import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Send, Calculator, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import {
  calcularFolhaMensal,
  calcularFolhaEstimada,
  aplicarExtras,
  EMPTY_EXTRAS,
  mesRefAtual,
  type TrabalhadorEncargo,
  type RegistroValor,
  type FolhaItemExtras,
} from "@/lib/folhaMaoObra";

interface Conta {
  id: string;
  nome: string;
  tipo?: string | null;
}

interface Folha {
  id: string;
  mes_ref: string;
  total_diarias: number;
  total_fgts: number;
  total_inss: number;
  status: string;
}

interface Props {
  userId: string;
  trabalhadores: TrabalhadorEncargo[];
  registros: RegistroValor[];
  contas: Conta[];
  folhas: Folha[];
  onChange: () => void;
}

const EXTRA_FIELDS: { key: keyof FolhaItemExtras; label: string }[] = [
  { key: "fgts", label: "FGTS" },
  { key: "inss", label: "INSS" },
  { key: "quinzena", label: "Quinzena" },
  { key: "vales", label: "Vales" },
  { key: "vale_alimentacao", label: "V. Alim." },
  { key: "encerramento", label: "Encerram." },
  { key: "ferias_decimo", label: "Férias/13°" },
  { key: "horas_extras", label: "H. Extras" },
];

export default function MaoObraFolhaTab({
  userId,
  trabalhadores,
  registros,
  contas,
  folhas,
  onChange,
}: Props) {
  const [mesRef, setMesRef] = useState(mesRefAtual());
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Mapa de extras por trabalhador (id -> extras)
  const [extrasMap, setExtrasMap] = useState<Record<string, FolhaItemExtras>>({});
  const [custosEng, setCustosEng] = useState(0);
  const [exames, setExames] = useState(0);
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const folhaReal = useMemo(
    () => calcularFolhaMensal(trabalhadores, registros, mesRef),
    [trabalhadores, registros, mesRef],
  );
  const folhaEstimada = useMemo(
    () => calcularFolhaEstimada(trabalhadores),
    [trabalhadores],
  );
  const usarEstimativa = folhaReal.itens.length === 0;
  const folhaBase = usarEstimativa ? folhaEstimada : folhaReal;
  const folha = useMemo(
    () => aplicarExtras(folhaBase, extrasMap),
    [folhaBase, extrasMap],
  );
  const totalGeralMes = folha.total_geral + custosEng + exames;

  const folhaLancada = folhas.find((f) => f.mes_ref === mesRef);

  // ---------- Carrega extras do mês ----------
  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("obra_mao_obra_folha_item")
        .select("*")
        .eq("mes_ref", mesRef)
        .is("deleted_at", null);
      if (cancel) return;
      const map: Record<string, FolhaItemExtras> = {};
      (data ?? []).forEach((r: any) => {
        map[r.trabalhador_id] = {
          quinzena: Number(r.quinzena) || 0,
          vales: Number(r.vales) || 0,
          vale_alimentacao: Number(r.vale_alimentacao) || 0,
          encerramento: Number(r.encerramento) || 0,
          ferias_decimo: Number(r.ferias_decimo) || 0,
          horas_extras: Number(r.horas_extras) || 0,
        };
      });
      setExtrasMap(map);

      const { data: f } = await (supabase as any)
        .from("obra_mao_obra_folha")
        .select("custos_engenharia,exames")
        .eq("mes_ref", mesRef)
        .maybeSingle();
      setCustosEng(Number(f?.custos_engenharia) || 0);
      setExames(Number(f?.exames) || 0);
    })();
    return () => {
      cancel = true;
    };
  }, [mesRef]);

  // ---------- Atualiza extra (debounce upsert) ----------
  const updateExtra = (trabalhadorId: string, field: keyof FolhaItemExtras, value: number) => {
    setExtrasMap((prev) => ({
      ...prev,
      [trabalhadorId]: { ...EMPTY_EXTRAS, ...(prev[trabalhadorId] ?? {}), [field]: value },
    }));

    const key = `${trabalhadorId}:${field}`;
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(async () => {
      const next = {
        ...EMPTY_EXTRAS,
        ...(extrasMap[trabalhadorId] ?? {}),
        [field]: value,
      };
      const { error } = await (supabase as any)
        .from("obra_mao_obra_folha_item")
        .upsert(
          {
            user_id: userId,
            trabalhador_id: trabalhadorId,
            mes_ref: mesRef,
            ...next,
          },
          { onConflict: "user_id,trabalhador_id,mes_ref" },
        );
      if (error) toast.error("Erro ao salvar: " + error.message);
    }, 600);
  };

  // ---------- Atualiza custos do mês ----------
  const upsertFolhaMes = async (patch: { custos_engenharia?: number; exames?: number }) => {
    const { error } = await (supabase as any)
      .from("obra_mao_obra_folha")
      .upsert(
        {
          user_id: userId,
          mes_ref: mesRef,
          total_diarias: folha.total_diarias,
          total_fgts: folha.total_fgts,
          total_inss: folha.total_inss,
          ...patch,
          status: folhaLancada?.status ?? "rascunho",
        },
        { onConflict: "user_id,mes_ref" },
      );
    if (error) toast.error("Erro ao salvar custos: " + error.message);
  };

  const handleCustosBlur = (kind: "eng" | "exames") => {
    upsertFolhaMes(
      kind === "eng"
        ? { custos_engenharia: custosEng }
        : { exames },
    );
  };

  // ---------- form do dialog (encargos) ----------
  const [contaId, setContaId] = useState<string>("");
  const [valorFgts, setValorFgts] = useState("");
  const [valorInss, setValorInss] = useState("");
  const [dataPag, setDataPag] = useState(`${mesRef}-05`);

  useEffect(() => {
    if (showDialog) {
      setValorFgts(folha.total_fgts.toFixed(2));
      setValorInss(folha.total_inss.toFixed(2));
      setDataPag(`${mesRef}-05`);
      if (!contaId && contas[0]) setContaId(contas[0].id);
    }
  }, [showDialog]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLancar = async () => {
    if (!contaId) {
      toast.error("Selecione uma conta");
      return;
    }
    setSaving(true);
    const fgts = Number(valorFgts) || 0;
    const inss = Number(valorInss) || 0;

    try {
      const baseTx = {
        user_id: userId,
        tipo: "Saída",
        data: dataPag,
        conta_id: contaId,
        forma_pagamento: "PIX",
        recorrencia: "Única",
        status: "Pendente",
        data_vencimento: dataPag,
      };

      const { data: txFgts, error: e1 } = await (supabase as any)
        .from("obra_transacoes_fluxo")
        .insert({
          ...baseTx,
          descricao: `Encargos FGTS - ${mesRef}`,
          categoria: "Encargos FGTS",
          valor: fgts,
          referencia: `FOLHA-FGTS-${mesRef}`,
          origem_tipo: "folha_mao_obra",
        })
        .select("id")
        .single();
      if (e1) throw e1;

      const { data: txInss, error: e2 } = await (supabase as any)
        .from("obra_transacoes_fluxo")
        .insert({
          ...baseTx,
          descricao: `Encargos INSS - ${mesRef}`,
          categoria: "Encargos INSS",
          valor: inss,
          referencia: `FOLHA-INSS-${mesRef}`,
          origem_tipo: "folha_mao_obra",
        })
        .select("id")
        .single();
      if (e2) throw e2;

      const { error: e3 } = await (supabase as any)
        .from("obra_mao_obra_folha")
        .upsert(
          {
            user_id: userId,
            mes_ref: mesRef,
            total_diarias: folha.total_diarias,
            total_fgts: fgts,
            total_inss: inss,
            total_quinzena: folha.total_quinzena,
            total_vales: folha.total_vales,
            total_vale_alim: folha.total_vale_alim,
            total_encerramento: folha.total_encerramento,
            total_ferias: folha.total_ferias,
            total_horas_extras: folha.total_horas_extras,
            custos_engenharia: custosEng,
            exames,
            total_geral: totalGeralMes,
            detalhes: folha.itens,
            transacao_fgts_id: txFgts.id,
            transacao_inss_id: txInss.id,
            status: "lancada",
          },
          { onConflict: "user_id,mes_ref" },
        );
      if (e3) throw e3;

      toast.success("Encargos lançados em Contas a Pagar");
      setShowDialog(false);
      onChange();
    } catch (err: any) {
      toast.error("Erro ao lançar: " + (err?.message ?? "desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Label className="text-sm">Mês:</Label>
          <Input
            type="month"
            value={mesRef}
            onChange={(e) => setMesRef(e.target.value)}
            className="w-44"
          />
          {folhaLancada && (
            <Badge className="badge-success gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Encargos lançados
            </Badge>
          )}
          {!folhaLancada && usarEstimativa && folha.itens.length > 0 && (
            <Badge variant="outline" className="gap-1 text-warning border-warning/40">
              <Sparkles className="w-3 h-3" />
              Estimativa (sem registros)
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => setShowDialog(true)}
          disabled={!!folhaLancada || folha.total_fgts + folha.total_inss === 0}
          className="gap-1.5"
        >
          <Calculator className="w-4 h-4" />
          Lançar encargos do mês
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KPI label={usarEstimativa ? "Diárias est." : "Diárias"} value={folha.total_diarias} />
        <KPI label="Encargos" value={folha.total_fgts + folha.total_inss} accent="warning" />
        <KPI label="Adicionais" value={folha.total_extras} accent="info" />
        <KPI label="Custos do mês" value={custosEng + exames} />
        <KPI label="Total Geral" value={totalGeralMes} accent="primary" />
      </div>

      {/* Tabela */}
      <div className="glass-card overflow-hidden">
        {folha.itens.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhum trabalhador ativo para {mesRef}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Trabalhador</th>
                  <th className="text-right px-2 py-2">Dias</th>
                  <th className="text-right px-2 py-2">Bruto</th>
                  <th className="text-right px-2 py-2">FGTS</th>
                  <th className="text-right px-2 py-2">INSS</th>
                  {EXTRA_FIELDS.map((f) => (
                    <th key={f.key} className="text-right px-2 py-2">{f.label}</th>
                  ))}
                  <th className="text-right px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {folha.itens.map((i) => (
                  <tr key={i.trabalhador_id} className="border-t border-border/40">
                    <td className="px-3 py-1.5">
                      <div className="font-medium">{i.nome}</div>
                      <div className="text-muted-foreground text-[11px]">{i.funcao || "-"}</div>
                    </td>
                    <td className="px-2 py-1.5 text-right">{i.dias}</td>
                    <td className="px-2 py-1.5 text-right">{formatCurrency(i.bruto)}</td>
                    <td className="px-2 py-1.5 text-right text-warning">
                      {i.incide_encargos ? formatCurrency(i.fgts) : "-"}
                    </td>
                    <td className="px-2 py-1.5 text-right text-info">
                      {i.incide_encargos ? formatCurrency(i.inss) : "-"}
                    </td>
                    {EXTRA_FIELDS.map((f) => (
                      <td key={f.key} className="px-1 py-1 text-right">
                        <Input
                          type="number"
                          step="0.01"
                          value={(i[f.key] as number) || ""}
                          onChange={(e) =>
                            updateExtra(i.trabalhador_id, f.key, Number(e.target.value) || 0)
                          }
                          className="h-7 w-20 text-right text-xs px-1.5"
                          placeholder="0"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-right font-semibold">
                      {formatCurrency(i.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/20 font-semibold">
                <tr>
                  <td className="px-3 py-2 text-right" colSpan={2}>Subtotais</td>
                  <td className="px-2 py-2 text-right">{formatCurrency(folha.total_diarias)}</td>
                  <td className="px-2 py-2 text-right">{formatCurrency(folha.total_fgts)}</td>
                  <td className="px-2 py-2 text-right">{formatCurrency(folha.total_inss)}</td>
                  <td className="px-2 py-2 text-right">{formatCurrency(folha.total_quinzena)}</td>
                  <td className="px-2 py-2 text-right">{formatCurrency(folha.total_vales)}</td>
                  <td className="px-2 py-2 text-right">{formatCurrency(folha.total_vale_alim)}</td>
                  <td className="px-2 py-2 text-right">{formatCurrency(folha.total_encerramento)}</td>
                  <td className="px-2 py-2 text-right">{formatCurrency(folha.total_ferias)}</td>
                  <td className="px-2 py-2 text-right">{formatCurrency(folha.total_horas_extras)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(folha.total_geral)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Custos do mês */}
      <div className="glass-card p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Custos adicionais do mês</h3>
          <p className="text-xs text-muted-foreground">
            Lançamentos que não pertencem a um trabalhador específico
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Custos Engenharia</Label>
            <Input
              type="number"
              step="0.01"
              value={custosEng || ""}
              onChange={(e) => setCustosEng(Number(e.target.value) || 0)}
              onBlur={() => handleCustosBlur("eng")}
              placeholder="0,00"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Exames Funcionários</Label>
            <Input
              type="number"
              step="0.01"
              value={exames || ""}
              onChange={(e) => setExames(Number(e.target.value) || 0)}
              onBlur={() => handleCustosBlur("exames")}
              placeholder="0,00"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Subtotal Folha</Label>
            <div className="h-10 flex items-center px-3 rounded-md border border-border/40 bg-muted/20 text-sm">
              {formatCurrency(folha.total_geral)}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-primary">TOTAL GERAL</Label>
            <div className="h-10 flex items-center px-3 rounded-md border border-primary/40 bg-primary/10 text-sm font-bold text-primary">
              {formatCurrency(totalGeralMes)}
            </div>
          </div>
        </div>
      </div>

      {/* Dialog encargos */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="glass-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lançar encargos — {mesRef}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Os valores foram calculados automaticamente. Você pode ajustar antes de confirmar.
            </p>
            <div className="space-y-2">
              <Label>Conta de pagamento</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={contaId}
                onChange={(e) => setContaId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>FGTS (R$)</Label>
                <Input type="number" min="0" step="0.01" value={valorFgts} onChange={(e) => setValorFgts(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>INSS (R$)</Label>
                <Input type="number" min="0" step="0.01" value={valorInss} onChange={(e) => setValorInss(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Data de vencimento</Label>
              <Input type="date" value={dataPag} onChange={(e) => setDataPag(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button className="flex-1 gap-1.5" onClick={handleLancar} disabled={saving}>
                <Send className="w-4 h-4" />
                {saving ? "Lançando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KPI({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "primary" | "warning" | "info";
}) {
  const cls =
    accent === "warning"
      ? "stat-card-warning"
      : accent === "info"
      ? "stat-card-info"
      : accent === "primary"
      ? "stat-card-success"
      : "glass-card";
  const color =
    accent === "warning"
      ? "text-warning"
      : accent === "info"
      ? "text-info"
      : accent === "primary"
      ? "text-primary"
      : "";
  return (
    <div className={`${cls} p-4`}>
      <p className="text-xs text-muted-foreground uppercase">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{formatCurrency(value)}</p>
    </div>
  );
}
