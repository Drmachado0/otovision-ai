import { useState } from "react";
import { useCategorias } from "@/hooks/useCategorias";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}

const ADD_NEW = "__add_new__";

export default function CategoriaSelect({ value, onChange, className, placeholder }: Props) {
  const { categorias, addCategoria } = useCategorias();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newNome, setNewNome] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSelect = (v: string) => {
    if (v === ADD_NEW) {
      setNewNome("");
      setDialogOpen(true);
      return;
    }
    onChange(v);
  };

  const handleCreate = async () => {
    const nome = newNome.trim();
    if (!nome) { toast.error("Informe o nome da categoria"); return; }
    setSaving(true);
    const created = await addCategoria(nome);
    setSaving(false);
    if (created) {
      onChange(created);
      setDialogOpen(false);
      toast.success("Categoria adicionada");
    } else {
      toast.error("Não foi possível criar a categoria");
    }
  };

  // Garante que o valor atual apareça mesmo se ainda não estiver na lista
  const options = value && !categorias.some((c) => c.toLowerCase() === value.toLowerCase())
    ? [value, ...categorias]
    : categorias;

  return (
    <>
      <select
        value={value}
        onChange={(e) => handleSelect(e.target.value)}
        className={
          className ??
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        }
      >
        {!value && <option value="">{placeholder || "Selecione..."}</option>}
        {options.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
        <option value={ADD_NEW}>+ Nova categoria...</option>
      </select>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle>Nova categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Nome</Label>
            <Input
              autoFocus
              value={newNome}
              onChange={(e) => setNewNome(e.target.value)}
              placeholder="Ex: Pintura"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreate(); } }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Salvando..." : "Adicionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
