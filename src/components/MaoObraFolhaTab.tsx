import { useEffect, useMemo, useState } from "react";
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
import { CheckCircle2, Send, Calculator } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import {
  calcularFolhaMensal,
  mesRefAtual,
  type TrabalhadorEncargo,
  type RegistroValor,
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

  const folha = useMemo(
    () => calcularFolhaMensal(trabalhadores, registros, mesRef),
    [trabalhadores, registros, mesRef],
  );

  const folhaLancada = folhas.find((f) => f.mes_ref === mesRef);

  // form do dialog
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
      // 1) cria as 2 transações
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

      // 2) cria registro de folha
      const { error: e3 } = await (supabase as any)
        .from("obra_mao_obra_folha")
        .insert({
          user_id: userId,
          mes_ref: mesRef,
          total_diarias: folha.total_diarias,
          total_fgts: fgts,
          total_inss: inss,
          detalhes: folha.itens,
          transacao_fgts_id: txFgts.id,
          transacao_inss_id: txInss.id,
          status: "lancada",
        });
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
      {/* Header da aba */}
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
        </div>
        <Button
          size="sm"
          onClick={() => setShowDialog(true)}
          disabled={!!folhaLancada || folha.itens.length === 0}
          className="gap-1.5"
        >
          <Calculator className="w-4 h-4" />
          Lançar encargos do mês
        </Button>
      </div>

      {/* Totais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="Diárias" value={folha.total_diarias} />
        <KPI label="FGTS" value={folha.total_fgts} accent="warning" />
        <KPI label="INSS" value={folha.total_inss} accent="info" />
        <KPI label="Total Folha" value={folha.total_geral} accent="primary" />
      </div>

      {/* Tabela */}
      <div className="glass-card overflow-hidden">
        {folha.itens.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Sem registros para {mesRef}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Trabalhador</th>
                  <th className="text-left px-4 py-2">Função</th>
                  <th className="text-right px-4 py-2">Dias</th>
                  <th className="text-right px-4 py-2">Bruto</th>
                  <th className="text-right px-4 py-2">FGTS</th>
                  <th className="text-right px-4 py-2">INSS</th>
                  <th className="text-right px-4 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {folha.itens.map((i) => (
                  <tr key={i.trabalhador_id} className="border-t border-border/40">
                    <td className="px-4 py-2 font-medium">{i.nome}</td>
                    <td className="px-4 py-2 text-muted-foreground">{i.funcao || "-"}</td>
                    <td className="px-4 py-2 text-right">{i.dias}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(i.bruto)}</td>
                    <td className="px-4 py-2 text-right text-warning">
                      {i.incide_encargos ? formatCurrency(i.fgts) : "-"}
                    </td>
                    <td className="px-4 py-2 text-right text-info">
                      {i.incide_encargos ? formatCurrency(i.inss) : "-"}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold">
                      {formatCurrency(i.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/20 font-semibold">
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right">Totais</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(folha.total_diarias)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(folha.total_fgts)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(folha.total_inss)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(folha.total_geral)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Dialog de lançamento */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="glass-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lançar encargos — {mesRef}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Os valores foram calculados automaticamente sobre os trabalhadores
              com encargos ativos. Você pode ajustar antes de confirmar.
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
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={valorFgts}
                  onChange={(e) => setValorFgts(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>INSS (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={valorInss}
                  onChange={(e) => setValorInss(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Data de vencimento</Label>
              <Input
                type="date"
                value={dataPag}
                onChange={(e) => setDataPag(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 gap-1.5"
                onClick={handleLancar}
                disabled={saving}
              >
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
