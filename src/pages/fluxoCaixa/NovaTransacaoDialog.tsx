import type { Dispatch, SetStateAction, FormEvent } from "react";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CategoriaSelect from "@/components/CategoriaSelect";
import { FORMAS_PAGAMENTO, type FluxoForm } from "./types";

interface NovaTransacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: FluxoForm;
  setForm: Dispatch<SetStateAction<FluxoForm>>;
  valorError: string;
  setValorError: (v: string) => void;
  saving: boolean;
  contas: { id: string; nome: string }[];
  onSubmit: (e: FormEvent) => void;
}

export function NovaTransacaoDialog({
  open,
  onOpenChange,
  form,
  setForm,
  valorError,
  setValorError,
  saving,
  contas,
  onSubmit,
}: NovaTransacaoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle>Nova Transação</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1">
                <option>Saída</option>
                <option>Entrada</option>
              </select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Valor (R$)</Label>
              <Input type="number" step="0.01" value={form.valor} onChange={e => { setForm(f => ({ ...f, valor: e.target.value })); setValorError(""); }} placeholder="0,00" className={`mt-1 ${valorError ? "border-destructive ring-destructive" : ""}`} />
              {valorError && <p className="text-xs text-destructive mt-1">{valorError}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Data</Label>
              <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Categoria</Label>
              <div className="mt-1">
                <CategoriaSelect value={form.categoria} onChange={(v) => setForm(f => ({ ...f, categoria: v }))} />
              </div>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Descrição</Label>
            <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Cimento CP-II" className="mt-1" />
          </div>
          {/* Tipo de Lançamento (so para Saidas) */}
          {form.tipo === "Saída" && (
            <div>
              <Label className="text-xs text-muted-foreground">Tipo de Lançamento</Label>
              <div className="flex gap-1 mt-1">
                {(["Única", "Parcelada", "Recorrente"] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, recorrencia_tipo: t }))}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                      form.recorrencia_tipo === t ? "bg-primary text-primary-foreground" : "bg-accent/50 text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Vencimento */}
          {form.tipo === "Saída" && (
            <div>
              <Label className="text-xs text-muted-foreground">Data de Vencimento</Label>
              <Input type="date" value={form.data_vencimento} onChange={e => setForm(f => ({ ...f, data_vencimento: e.target.value }))} className="mt-1" />
            </div>
          )}
          {/* Parcelas */}
          {form.tipo === "Saída" && form.recorrencia_tipo === "Parcelada" && (
            <div>
              <Label className="text-xs text-muted-foreground">Número de Parcelas</Label>
              <Input type="number" min="2" max="48" value={form.numero_parcelas} onChange={e => setForm(f => ({ ...f, numero_parcelas: e.target.value }))} className="mt-1" />
              <p className="text-[10px] text-muted-foreground mt-1">Valor por parcela: {formatCurrency(Number(form.valor) / (parseInt(form.numero_parcelas) || 1))}</p>
            </div>
          )}
          {/* Periodicidade */}
          {form.tipo === "Saída" && form.recorrencia_tipo === "Recorrente" && (
            <div>
              <Label className="text-xs text-muted-foreground">Periodicidade</Label>
              <select value={form.periodicidade} onChange={e => setForm(f => ({ ...f, periodicidade: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1">
                <option value="Mensal">Mensal</option>
                <option value="Trimestral">Trimestral</option>
                <option value="Anual">Anual</option>
              </select>
            </div>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Forma de Pagamento</Label>
            <select value={form.forma_pagamento} onChange={e => setForm(f => ({ ...f, forma_pagamento: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1">
              {FORMAS_PAGAMENTO.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          {/* Conta - obrigatoria so para Entradas */}
          <div>
            <Label className="text-xs text-muted-foreground">Conta {form.tipo === "Entrada" && contas.length > 0 && <span className="text-destructive">*</span>}</Label>
            <select value={form.conta_id} onChange={e => setForm(f => ({ ...f, conta_id: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1">
              <option value="">{form.tipo === "Saída" ? "Definir no pagamento" : "Selecione uma conta"}</option>
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            {form.tipo === "Saída" && <p className="text-[10px] text-muted-foreground mt-1">Para saídas, a conta será selecionada ao confirmar o pagamento</p>}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Observações</Label>
            <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} className="mt-1" />
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Salvando..." : "Registrar Transação"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
