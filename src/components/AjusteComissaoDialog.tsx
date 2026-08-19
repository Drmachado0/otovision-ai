import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, formatMes, todayLocalISO } from "@/lib/formatters";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Calculator, PlusCircle, Scale, Save, Info } from "lucide-react";
import { toast } from "sonner";
import { PERCENTUAL_COMISSAO, type ComissaoRow } from "@/pages/comissao/types";

type ModoAjuste = "manual" | "editar" | "global";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdate: () => void;
  /** Comissões existentes — usadas para o modo "editar" e para o cálculo do ajuste global. */
  comissoes: ComissaoRow[];
  /** Gasto total por mês de referência (YYYY-MM → soma das saídas). */
  gastosPorMes: Record<string, number>;
  /** Meses disponíveis, mais recentes primeiro. */
  mesesDisponiveis: string[];
}

const hoje = () => todayLocalISO().slice(0, 7);

export default function AjusteComissaoDialog({
  open,
  onOpenChange,
  onUpdate,
  comissoes,
  gastosPorMes,
  mesesDisponiveis,
}: Props) {
  const { user } = useAuth();
  const [modo, setModo] = useState<ModoAjuste>("manual");
  const [saving, setSaving] = useState(false);

  // ----- Modo MANUAL (novo lançamento avulso) -----
  const [mMes, setMMes] = useState(hoje());
  const [mFornecedor, setMFornecedor] = useState("");
  const [mCategoria, setMCategoria] = useState("");
  const [mValor, setMValor] = useState("");
  const [mObs, setMObs] = useState("");
  const [mPago, setMPago] = useState(false);

  // ----- Modo EDITAR (corrigir comissão existente) -----
  const [eComissaoId, setEComissaoId] = useState("");
  const [eNovoValor, setENovoValor] = useState("");
  const [eMotivo, setEMotivo] = useState("");

  // ----- Modo GLOBAL (acerto do mês: diferença teórica vs lançada) -----
  const [gMes, setGMes] = useState(hoje());

  const comissaoSelecionada = useMemo(
    () => comissoes.find((c) => c.id === eComissaoId) || null,
    [comissoes, eComissaoId],
  );

  // Cálculo do ajuste global para o mês escolhido
  const calcGlobal = useMemo(() => {
    const gasto = gastosPorMes[gMes] || 0;
    const teorica = gasto * (PERCENTUAL_COMISSAO / 100);
    const lancada = comissoes
      .filter((c) => (c.mes || "") === gMes)
      .reduce((s, c) => s + Number(c.valor || 0), 0);
    const diferenca = teorica - lancada;
    return { gasto, teorica, lancada, diferenca };
  }, [gMes, gastosPorMes, comissoes]);

  const reset = () => {
    setMFornecedor(""); setMCategoria(""); setMValor(""); setMObs(""); setMPago(false);
    setEComissaoId(""); setENovoValor(""); setEMotivo("");
  };

  const close = () => { reset(); onOpenChange(false); };

  // ---------- SUBMIT: MANUAL ----------
  const submitManual = async () => {
    const valor = parseFloat(mValor.replace(",", "."));
    if (!valor || valor <= 0) { toast.error("Informe um valor válido"); return; }
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("obra_comissao_pagamentos").insert({
      user_id: user.id,
      transacao_id: null,
      mes: mMes,
      data_pagamento: mPago ? new Date().toISOString() : "",
      valor,
      pago: mPago,
      auto: false,
      categoria: mCategoria || "Ajuste",
      fornecedor: mFornecedor || "Ajuste manual",
      forma_pagamento: "",
      observacoes: `Ajuste manual de comissão${mObs ? " - " + mObs : ""}`,
    } as never);
    setSaving(false);
    if (error) { toast.error("Erro ao criar ajuste: " + error.message); return; }
    toast.success("Ajuste de comissão criado");
    onUpdate();
    close();
  };

  // ---------- SUBMIT: EDITAR ----------
  const submitEditar = async () => {
    if (!comissaoSelecionada) { toast.error("Selecione uma comissão"); return; }
    const novo = parseFloat(eNovoValor.replace(",", "."));
    if (isNaN(novo) || novo < 0) { toast.error("Informe um valor válido"); return; }
    const antigo = Number(comissaoSelecionada.valor);
    const obsAtual = comissaoSelecionada.observacoes || "";
    const nota = ` [Ajuste manual ${todayLocalISO()}: ${formatCurrency(antigo)} → ${formatCurrency(novo)}${eMotivo ? " · " + eMotivo : ""}]`;
    setSaving(true);
    const { error } = await supabase
      .from("obra_comissao_pagamentos")
      .update({ valor: novo, observacoes: obsAtual + nota } as never)
      .eq("id", comissaoSelecionada.id);
    setSaving(false);
    if (error) { toast.error("Erro ao ajustar: " + error.message); return; }
    toast.success(`Comissão ajustada de ${formatCurrency(antigo)} para ${formatCurrency(novo)}`);
    onUpdate();
    close();
  };

  // ---------- SUBMIT: GLOBAL ----------
  const submitGlobal = async () => {
    const { gasto, teorica, lancada, diferenca } = calcGlobal;
    if (Math.abs(diferenca) < 0.01) { toast.error("Não há diferença a ajustar neste mês"); return; }
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("obra_comissao_pagamentos").insert({
      user_id: user.id,
      transacao_id: null,
      mes: gMes,
      data_pagamento: "",
      valor: diferenca,
      pago: false,
      auto: false,
      categoria: "Ajuste de fechamento",
      fornecedor: "Acerto mensal",
      forma_pagamento: "",
      observacoes:
        `Ajuste de fechamento ${formatMes(gMes)}: gasto ${formatCurrency(gasto)} × ${PERCENTUAL_COMISSAO}% = ` +
        `${formatCurrency(teorica)} (teórica) − ${formatCurrency(lancada)} (lançada) = ${formatCurrency(diferenca)}.`,
    } as never);
    setSaving(false);
    if (error) { toast.error("Erro ao lançar ajuste: " + error.message); return; }
    toast.success(`Ajuste de ${formatCurrency(diferenca)} lançado para ${formatMes(gMes)}`);
    onUpdate();
    close();
  };

  const submit = () => {
    if (modo === "manual") return submitManual();
    if (modo === "editar") return submitEditar();
    return submitGlobal();
  };

  const tabs: { id: ModoAjuste; label: string; icon: React.ReactNode }[] = [
    { id: "manual", label: "Novo ajuste", icon: <PlusCircle className="w-4 h-4" /> },
    { id: "editar", label: "Corrigir valor", icon: <Calculator className="w-4 h-4" /> },
    { id: "global", label: "Acerto do mês", icon: <Scale className="w-4 h-4" /> },
  ];

  return (
    <Sheet open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" /> Ajuste de Comissão
          </SheetTitle>
        </SheetHeader>

        {/* Tabs de modo */}
        <div className="flex gap-1 mt-4 p-1 rounded-lg bg-accent/40">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setModo(t.id)}
              className={`flex-1 px-2 py-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                modo === t.id ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-4">
          {/* ---------- MANUAL ---------- */}
          {modo === "manual" && (
            <>
              <p className="text-xs text-muted-foreground flex items-start gap-2">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Crie uma linha de comissão avulsa quando faltou uma comissão ou o valor precisa ser ajustado manualmente.
              </p>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Mês de referência</span>
                <Input type="month" value={mMes} onChange={(e) => setMMes(e.target.value)} className="mt-1" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Fornecedor / Referência</span>
                <Input value={mFornecedor} onChange={(e) => setMFornecedor(e.target.value)} placeholder="Ex.: Grupo Rosa" className="mt-1" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Categoria</span>
                <Input value={mCategoria} onChange={(e) => setMCategoria(e.target.value)} placeholder="Ex.: Materiais de Construção" className="mt-1" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Valor da comissão (R$)</span>
                <Input inputMode="decimal" value={mValor} onChange={(e) => setMValor(e.target.value)} placeholder="0,00" className="mt-1" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Observação (opcional)</span>
                <Input value={mObs} onChange={(e) => setMObs(e.target.value)} placeholder="Motivo do ajuste" className="mt-1" />
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={mPago} onChange={(e) => setMPago(e.target.checked)} className="rounded" />
                <span className="text-sm">Já pago (dar baixa agora)</span>
              </label>
            </>
          )}

          {/* ---------- EDITAR ---------- */}
          {modo === "editar" && (
            <>
              <p className="text-xs text-muted-foreground flex items-start gap-2">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Corrija o valor de uma comissão já existente. O valor antigo fica registrado nas observações para auditoria.
              </p>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Comissão a corrigir</span>
                <select
                  value={eComissaoId}
                  onChange={(e) => { setEComissaoId(e.target.value); const c = comissoes.find((x) => x.id === e.target.value); if (c) setENovoValor(String(Number(c.valor))); }}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione…</option>
                  {comissoes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {formatMes(c.mes || "")} · {c.fornecedor || "—"} · {formatCurrency(Number(c.valor))} {c.pago ? "(pago)" : "(pendente)"}
                    </option>
                  ))}
                </select>
              </label>
              {comissaoSelecionada && (
                <div className="rounded-lg bg-accent/40 p-3 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Valor atual</span><span className="font-medium">{formatCurrency(Number(comissaoSelecionada.valor))}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span>{comissaoSelecionada.pago ? "Pago" : "Pendente"}</span></div>
                </div>
              )}
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Novo valor (R$)</span>
                <Input inputMode="decimal" value={eNovoValor} onChange={(e) => setENovoValor(e.target.value)} placeholder="0,00" className="mt-1" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Motivo do ajuste (opcional)</span>
                <Input value={eMotivo} onChange={(e) => setEMotivo(e.target.value)} placeholder="Ex.: valor real pago diferente do calculado" className="mt-1" />
              </label>
            </>
          )}

          {/* ---------- GLOBAL ---------- */}
          {modo === "global" && (
            <>
              <p className="text-xs text-muted-foreground flex items-start gap-2">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Lança a diferença entre a comissão teórica ({PERCENTUAL_COMISSAO}% do gasto do mês) e o total já lançado, como uma linha de acerto.
              </p>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Mês do fechamento</span>
                <select
                  value={gMes}
                  onChange={(e) => setGMes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {mesesDisponiveis.map((m) => (
                    <option key={m} value={m}>{formatMes(m)}</option>
                  ))}
                </select>
              </label>
              <div className="rounded-lg bg-accent/40 p-3 text-sm space-y-1.5">
                <div className="flex justify-between"><span className="text-muted-foreground">Gasto do mês</span><span className="font-medium">{formatCurrency(calcGlobal.gasto)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Comissão teórica ({PERCENTUAL_COMISSAO}%)</span><span className="font-medium">{formatCurrency(calcGlobal.teorica)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Comissão já lançada</span><span className="font-medium">{formatCurrency(calcGlobal.lancada)}</span></div>
                <div className="flex justify-between border-t border-border/50 pt-1.5">
                  <span className="font-semibold">Diferença a lançar</span>
                  <span className={`font-bold ${calcGlobal.diferenca >= 0 ? "text-success" : "text-destructive"}`}>
                    {calcGlobal.diferenca >= 0 ? "+" : ""}{formatCurrency(calcGlobal.diferenca)}
                  </span>
                </div>
              </div>
              {Math.abs(calcGlobal.diferenca) < 0.01 && (
                <p className="text-xs text-success">✓ O mês está batido — não há diferença a ajustar.</p>
              )}
            </>
          )}
        </div>

        {/* Ações */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={close}
            className="flex-1 px-4 py-2.5 rounded-lg bg-accent/50 hover:bg-accent text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? "Salvando…" : "Salvar ajuste"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
