import type { Dispatch, SetStateAction, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StarRating } from "./StarRating";
import { TIPOS_PIX, type FornecedorForm } from "./types";

interface FornecedorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: boolean;
  form: FornecedorForm;
  setForm: Dispatch<SetStateAction<FornecedorForm>>;
  saving: boolean;
  onSubmit: (e: FormEvent) => void;
}

export function FornecedorFormDialog({
  open,
  onOpenChange,
  editing,
  form,
  setForm,
  saving,
  onSubmit,
}: FornecedorFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Nome *</Label>
            <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} className="mt-1" placeholder="Ex: Materiais ABC Ltda" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">CNPJ</Label>
              <Input value={form.cnpj} onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))} className="mt-1" placeholder="00.000.000/0000-00" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Telefone</Label>
              <Input value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} className="mt-1" placeholder="(00) 00000-0000" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">E-mail</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="mt-1" placeholder="contato@fornecedor.com" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Endereco</Label>
            <Input value={form.endereco} onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))} className="mt-1" placeholder="Rua, numero, bairro, cidade" />
          </div>

          {/* Banking */}
          <div className="p-3 rounded-lg border border-border bg-secondary/30 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dados Bancarios</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Banco</Label>
                <Input value={form.banco} onChange={(e) => setForm((f) => ({ ...f, banco: e.target.value }))} className="mt-1" placeholder="Ex: Bradesco" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Agencia</Label>
                <Input value={form.agencia} onChange={(e) => setForm((f) => ({ ...f, agencia: e.target.value }))} className="mt-1" placeholder="0000" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Conta</Label>
                <Input value={form.conta} onChange={(e) => setForm((f) => ({ ...f, conta: e.target.value }))} className="mt-1" placeholder="00000-0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Tipo PIX</Label>
                <select value={form.tipo_pix} onChange={(e) => setForm((f) => ({ ...f, tipo_pix: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                  {TIPOS_PIX.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Chave PIX</Label>
                <Input value={form.pix} onChange={(e) => setForm((f) => ({ ...f, pix: e.target.value }))} className="mt-1" placeholder="Chave PIX" />
              </div>
            </div>
          </div>

          {/* Rating */}
          <div>
            <Label className="text-xs text-muted-foreground">Avaliacao</Label>
            <div className="mt-1">
              <StarRating value={form.avaliacao} onChange={(v) => setForm((f) => ({ ...f, avaliacao: v }))} />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Observações</Label>
            <Textarea value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} rows={2} className="mt-1" />
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Salvando..." : editing ? "Salvar Alteracoes" : "Cadastrar Fornecedor"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
