import type { Dispatch, SetStateAction, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TrabalhadorForm } from "./types";

interface TrabalhadorFormDialogProps {
  open: boolean;
  editingId: string | null;
  form: TrabalhadorForm;
  setForm: Dispatch<SetStateAction<TrabalhadorForm>>;
  saving: boolean;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}

export function TrabalhadorFormDialog({
  open,
  editingId,
  form,
  setForm,
  saving,
  onSubmit,
  onClose,
}: TrabalhadorFormDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="glass-card sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingId ? "Editar Trabalhador" : "Novo Trabalhador"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              placeholder="Nome completo"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="funcao">Função</Label>
            <Input
              id="funcao"
              placeholder="Ex: Pedreiro, Eletricista..."
              value={form.funcao}
              onChange={(e) => setForm({ ...form, funcao: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              placeholder="(00) 00000-0000"
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="valor_diaria">Valor Diária (R$)</Label>
              <Input
                id="valor_diaria"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={form.valor_diaria}
                onChange={(e) =>
                  setForm({ ...form, valor_diaria: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor_hora">Valor Hora (R$)</Label>
              <Input
                id="valor_hora"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={form.valor_hora}
                onChange={(e) =>
                  setForm({ ...form, valor_hora: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tipo_contrato">Tipo de Contrato</Label>
              <select
                id="tipo_contrato"
                value={form.tipo_contrato}
                onChange={(e) =>
                  setForm({ ...form, tipo_contrato: e.target.value })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option>Diária</option>
                <option>Hora</option>
                <option>Mensal</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_inicio">Data Início</Label>
              <Input
                id="data_inicio"
                type="date"
                value={form.data_inicio}
                onChange={(e) =>
                  setForm({ ...form, data_inicio: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Input
              id="observacoes"
              placeholder="Anotações sobre o trabalhador..."
              value={form.observacoes}
              onChange={(e) =>
                setForm({ ...form, observacoes: e.target.value })
              }
            />
          </div>

          {/* Encargos */}
          <div className="space-y-3 rounded-md border border-border/50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Calcular encargos (FGTS / INSS)</Label>
                <p className="text-xs text-muted-foreground">
                  Inclui este trabalhador no lançamento mensal de encargos
                </p>
              </div>
              <Switch
                checked={form.incide_encargos}
                onCheckedChange={(v) => setForm({ ...form, incide_encargos: v })}
              />
            </div>
            {form.incide_encargos && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="aliquota_fgts">FGTS (%)</Label>
                  <Input
                    id="aliquota_fgts"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.aliquota_fgts}
                    onChange={(e) => setForm({ ...form, aliquota_fgts: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aliquota_inss">INSS (%)</Label>
                  <Input
                    id="aliquota_inss"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.aliquota_inss}
                    onChange={(e) => setForm({ ...form, aliquota_inss: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? "Salvando..." : editingId ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
