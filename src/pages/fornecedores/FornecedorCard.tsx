import { memo } from "react";
import { Building2, Phone, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "./StarRating";
import type { Fornecedor } from "./types";

interface FornecedorCardProps {
  fornecedor: Fornecedor;
  gasto: number;
  index: number;
  onSelect: (f: Fornecedor) => void;
  onEdit: (f: Fornecedor) => void;
  onToggleAtivo: (f: Fornecedor) => void;
}

export const FornecedorCard = memo(function FornecedorCard({
  fornecedor: forn,
  gasto,
  index: i,
  onSelect,
  onEdit,
  onToggleAtivo,
}: FornecedorCardProps) {
  return (
    <div
      className={`glass-card p-5 cursor-pointer transition-all hover:scale-[1.02] animate-fade-in-up ${!forn.ativo ? "opacity-50" : ""}`}
      style={{ animationDelay: `${i * 80}ms` }}
      onClick={() => onSelect(forn)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{forn.nome}</h3>
            {forn.cnpj && <p className="text-xs text-muted-foreground">{forn.cnpj}</p>}
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(forn); }}>
            <Pencil className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onToggleAtivo(forn); }}>
            {forn.ativo ? <ToggleRight className="w-4 h-4 text-success" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {forn.telefone && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="w-3 h-3" />
            <span>{forn.telefone}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <StarRating value={forn.avaliacao || 0} />
          <span className={`text-sm font-semibold ${gasto > 0 ? "text-warning" : "text-muted-foreground"}`}>
            {formatCurrency(gasto)}
          </span>
        </div>
        {!forn.ativo && (
          <Badge variant="secondary" className="text-xs">Inativo</Badge>
        )}
      </div>
    </div>
  );
});
