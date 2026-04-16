import { useState } from "react";
import { useFornecedores } from "@/hooks/useFornecedores";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  value: string;
  onChange: (nome: string) => void;
  placeholder?: string;
  className?: string;
}

export default function FornecedorCombobox({ value, onChange, placeholder, className }: Props) {
  const { fornecedores, addFornecedor } = useFornecedores();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [novo, setNovo] = useState({ nome: "", telefone: "" });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    const nome = novo.nome.trim();
    if (!nome) { toast.error("Informe o nome"); return; }
    setSaving(true);
    const created = await addFornecedor(nome, novo.telefone);
    setSaving(false);
    if (created) {
      onChange(created.nome);
      setDialogOpen(false);
      setOpen(false);
      setNovo({ nome: "", telefone: "" });
      toast.success("Fornecedor cadastrado");
    } else {
      toast.error("Erro ao cadastrar fornecedor");
    }
  };

  const handleUseTyped = () => {
    if (search.trim()) {
      onChange(search.trim());
      setSearch("");
      setOpen(false);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-left ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              !value && "text-muted-foreground",
              className
            )}
          >
            <span className="truncate">{value || placeholder || "Selecione um fornecedor..."}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover" align="start">
          <Command shouldFilter={true}>
            <CommandInput
              placeholder="Buscar fornecedor..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                <div className="p-2 space-y-2">
                  <p className="text-xs text-muted-foreground text-center">Nenhum fornecedor encontrado</p>
                  {search.trim() && (
                    <Button type="button" size="sm" variant="outline" className="w-full text-xs" onClick={handleUseTyped}>
                      Usar "{search.trim()}"
                    </Button>
                  )}
                </div>
              </CommandEmpty>
              {fornecedores.length > 0 && (
                <CommandGroup heading="Cadastrados">
                  {fornecedores.map((f) => (
                    <CommandItem
                      key={f.id}
                      value={f.nome}
                      onSelect={() => { onChange(f.nome); setOpen(false); setSearch(""); }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", value === f.nome ? "opacity-100" : "opacity-0")} />
                      <div className="flex-1">
                        <p className="text-sm">{f.nome}</p>
                        {f.especialidade && <p className="text-[10px] text-muted-foreground">{f.especialidade}</p>}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandGroup>
                <CommandItem
                  value="__add_new__"
                  onSelect={() => { setNovo({ nome: search.trim(), telefone: "" }); setDialogOpen(true); }}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar novo fornecedor
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle>Novo fornecedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Nome *</Label>
              <Input autoFocus value={novo.nome} onChange={(e) => setNovo((n) => ({ ...n, nome: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Telefone</Label>
              <Input value={novo.telefone} onChange={(e) => setNovo((n) => ({ ...n, telefone: e.target.value }))} placeholder="(opcional)" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Salvando..." : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
