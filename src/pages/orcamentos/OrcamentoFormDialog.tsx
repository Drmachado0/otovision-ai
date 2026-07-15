import type { Dispatch, SetStateAction, FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import FornecedorCombobox from "@/components/FornecedorCombobox";
import CategoriaSelect from "@/components/CategoriaSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { OrcamentoItem } from "./types";

type OrcamentoForm = {
  fornecedor: string;
  descricao: string;
  categoria: string;
  valor_total: string;
  data: string;
  validade: string;
  condicoes_pagamento: string;
  observacoes: string;
};

interface OrcamentoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: OrcamentoForm;
  setForm: Dispatch<SetStateAction<OrcamentoForm>>;
  formItens: OrcamentoItem[];
  saving: boolean;
  onSubmit: (e: FormEvent) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onUpdateItem: (index: number, field: keyof OrcamentoItem, value: string | number) => void;
}

export function OrcamentoFormDialog({
  open,
  onOpenChange,
  form,
  setForm,
  formItens,
  saving,
  onSubmit,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
}: OrcamentoFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Orçamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Fornecedor</Label>
            <div className="mt-1">
              <FornecedorCombobox value={form.fornecedor} onChange={(v) => setForm(f => ({ ...f, fornecedor: v }))} />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Descrição</Label>
            <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} className="mt-1" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Categoria</Label>
              <div className="mt-1">
                <CategoriaSelect value={form.categoria} onChange={(v) => setForm(f => ({ ...f, categoria: v }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Data</Label>
              <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Validade</Label>
              <Input type="date" value={form.validade} onChange={e => setForm(f => ({ ...f, validade: e.target.value }))} className="mt-1" />
            </div>
          </div>

          {/* Line Items */}
          <div className="p-3 rounded-lg border border-border bg-secondary/30 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground uppercase">Itens do Orçamento</Label>
              <Button type="button" size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={onAddItem}>
                <Plus className="w-3 h-3" /> Item
              </Button>
            </div>
            {formItens.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  {index === 0 && <span className="text-[10px] text-muted-foreground">Descrição</span>}
                  <Input
                    value={item.descricao}
                    onChange={e => onUpdateItem(index, "descricao", e.target.value)}
                    placeholder="Descrição do item"
                    className="text-xs h-8"
                  />
                </div>
                <div className="col-span-2">
                  {index === 0 && <span className="text-[10px] text-muted-foreground">Qtd</span>}
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantidade}
                    onChange={e => onUpdateItem(index, "quantidade", Number(e.target.value))}
                    className="text-xs h-8"
                  />
                </div>
                <div className="col-span-2">
                  {index === 0 && <span className="text-[10px] text-muted-foreground">Unitário</span>}
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.valor_unitario}
                    onChange={e => onUpdateItem(index, "valor_unitario", Number(e.target.value))}
                    className="text-xs h-8"
                  />
                </div>
                <div className="col-span-2">
                  {index === 0 && <span className="text-[10px] text-muted-foreground">Total</span>}
                  <Input
                    value={formatCurrency(item.valor_total)}
                    readOnly
                    className="text-xs h-8 bg-muted/50"
                  />
                </div>
                <div className="col-span-1">
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => onRemoveItem(index)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {formItens.some(i => i.valor_total > 0) && (
              <div className="flex justify-end pt-2 border-t border-border/50">
                <span className="text-xs text-muted-foreground mr-2">Total dos itens:</span>
                <span className="text-sm font-bold">{formatCurrency(formItens.reduce((s, i) => s + i.valor_total, 0))}</span>
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Valor Total (R$)</Label>
            <Input type="number" step="0.01" value={form.valor_total} onChange={e => setForm(f => ({ ...f, valor_total: e.target.value }))} className="mt-1" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Condições de Pagamento</Label>
            <Input value={form.condicoes_pagamento} onChange={e => setForm(f => ({ ...f, condicoes_pagamento: e.target.value }))} className="mt-1" placeholder="Ex: 30/60/90 dias, PIX à vista..." />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Observações</Label>
            <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} className="mt-1" rows={3} />
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Salvando..." : "Registrar Orçamento"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
