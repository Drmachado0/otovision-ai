import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface DangerZoneSectionProps {
  showDangerDialog: boolean;
  setShowDangerDialog: (open: boolean) => void;
  dangerConfirm: string;
  setDangerConfirm: (value: string) => void;
  deleting: boolean;
  handleDeleteAll: () => void;
}

export function DangerZoneSection({
  showDangerDialog,
  setShowDangerDialog,
  dangerConfirm,
  setDangerConfirm,
  deleting,
  handleDeleteAll,
}: DangerZoneSectionProps) {
  return (
    <>
      {/* Danger Zone */}
      <section className="rounded-lg border-2 border-destructive/30 p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" /> Zona de Perigo
        </h2>
        <p className="text-sm text-muted-foreground">
          Ações irreversíveis. Recomendamos exportar um backup antes de prosseguir.
        </p>
        <Button
          variant="destructive"
          onClick={() => setShowDangerDialog(true)}
          className="gap-2"
        >
          <Trash2 className="w-4 h-4" /> Apagar Todos os Dados
        </Button>
      </section>

      {/* Danger Confirmation Dialog */}
      <Dialog open={showDangerDialog} onOpenChange={open => { if (!open) { setShowDangerDialog(false); setDangerConfirm(""); } }}>
        <DialogContent className="sm:max-w-md bg-card border-destructive/50">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Confirmar Exclusão Total
            </DialogTitle>
            <DialogDescription>
              Esta ação vai apagar <strong>permanentemente</strong> todos os dados financeiros, compras, comissões, documentos e configurações da obra. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">
                Digite <span className="font-mono font-bold text-destructive">APAGAR TUDO</span> para confirmar:
              </Label>
              <Input
                value={dangerConfirm}
                onChange={e => setDangerConfirm(e.target.value)}
                placeholder="APAGAR TUDO"
                className="mt-2 border-destructive/50 focus-visible:ring-destructive"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => { setShowDangerDialog(false); setDangerConfirm(""); }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={dangerConfirm !== "APAGAR TUDO" || deleting}
                onClick={handleDeleteAll}
                className="flex-1 gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? "Apagando..." : "Apagar Tudo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
