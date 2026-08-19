import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { parseFolhaJson } from "@/lib/folhaPagamento";

export function ImportarFolhaDialog({
  open, onOpenChange, onParsed,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onParsed: (p: ReturnType<typeof parseFolhaJson>) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleParse = () => {
    setError(null);
    try {
      const json = JSON.parse(text);
      const parsed = parseFolhaJson(json);
      onParsed(parsed);
      setText("");
    } catch (e: unknown) {
      setError(e?.message ?? "JSON inválido");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-2xl">
        <DialogHeader><DialogTitle>Importar folha (JSON)</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>Cole o JSON gerado pela IA/Hermes</Label>
          <textarea
            className="w-full h-72 rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='{ "competencia": "2026-04", "funcionarios": [...], "encargos": [...] }'
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleParse}>Importar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
