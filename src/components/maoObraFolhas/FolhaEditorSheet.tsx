import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2, RotateCcw, Send, Wallet, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { formatCurrency } from "@/lib/formatters";
import {
  FolhaItem, FolhaEncargo,
  calcularTotaisFolha, calcularTotaisItem, validarFolha,
  competenciaLabel,
} from "@/lib/folhaPagamento";
import { FolhaRow, STATUS_COLORS } from "./types";
import { MiniInput } from "./MiniInput";
import { recalcularFolhaDB, upsertTrabalhadores } from "./helpers";

export function FolhaEditorSheet({
  folhaId, open, onOpenChange,
}: { folhaId: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [folha, setFolha] = useState<FolhaRow | null>(null);
  const [itens, setItens] = useState<FolhaItem[]>([]);
  const [encargos, setEncargos] = useState<FolhaEncargo[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: detalhe, isLoading: loading } = useQuery({
    queryKey: ["folha-detalhe", folhaId],
    enabled: !!folhaId && open,
    queryFn: async () => {
      const [{ data: f }, { data: is }, { data: es }] = await Promise.all([
        (supabase as any).from("obra_folhas_pagamento").select("*").eq("id", folhaId).maybeSingle(),
        (supabase as any).from("obra_folha_pagamento_itens").select("*").eq("folha_id", folhaId).is("deleted_at", null).order("ref"),
        (supabase as any).from("obra_folha_pagamento_encargos").select("*").eq("folha_id", folhaId).is("deleted_at", null),
      ]);
      return {
        folha: (f ?? null) as FolhaRow | null,
        itens: ((is ?? []) as any[]).map((i: any) => calcularTotaisItem(i)) as FolhaItem[],
        encargos: (es ?? []) as FolhaEncargo[],
      };
    },
  });

  // sincroniza dados carregados para o estado editável local
  useEffect(() => {
    if (!detalhe) return;
    setFolha(detalhe.folha);
    setItens(detalhe.itens);
    setEncargos(detalhe.encargos);
  }, [detalhe]);

  const fetchAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["folha-detalhe", folhaId] });
  }, [queryClient, folhaId]);

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
    } catch (e: unknown) {
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
                        <td className="px-1 py-1"><MiniInput w={70} disabled={readonly} type="number" value={it.quinzena}

                          onChange={(v) => {
                            const n = Number(v);
                            if (n < 0) toast.warning("Quinzena convertida para positivo (é descontada do total)");
                            updateItem(idx, { quinzena: Math.abs(n) });
                          }} /></td>
                        <td className="px-1 py-1"><MiniInput w={70} disabled={readonly} type="number" value={it.vales}

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
                      } catch (e: unknown) {
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
