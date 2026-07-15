import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Send } from "lucide-react";
import type { Conta } from "./types";

interface LancarEncargosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mesRef: string;
  contas: Conta[];
  contaId: string;
  onContaIdChange: (v: string) => void;
  valorFgts: string;
  onValorFgtsChange: (v: string) => void;
  valorInss: string;
  onValorInssChange: (v: string) => void;
  dataPag: string;
  onDataPagChange: (v: string) => void;
  saving: boolean;
  onLancar: () => void;
}

export function LancarEncargosDialog({
  open,
  onOpenChange,
  mesRef,
  contas,
  contaId,
  onContaIdChange,
  valorFgts,
  onValorFgtsChange,
  valorInss,
  onValorInssChange,
  dataPag,
  onDataPagChange,
  saving,
  onLancar,
}: LancarEncargosDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              onChange={(e) => onContaIdChange(e.target.value)}
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
              <Input type="number" min="0" step="0.01" value={valorFgts} onChange={(e) => onValorFgtsChange(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>INSS (R$)</Label>
              <Input type="number" min="0" step="0.01" value={valorInss} onChange={(e) => onValorInssChange(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Data de vencimento</Label>
            <Input type="date" value={dataPag} onChange={(e) => onDataPagChange(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="flex-1 gap-1.5" onClick={onLancar} disabled={saving}>
              <Send className="w-4 h-4" />
              {saving ? "Lançando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
