import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";
import { competenciaLabel, referenciaFolha } from "@/lib/folhaPagamento";
import { FolhaRow, STATUS_COLORS } from "./types";

interface FolhaCardProps {
  folha: FolhaRow;
  onSelect: (id: string) => void;
}

export const FolhaCard = memo(function FolhaCard({ folha: f, onSelect }: FolhaCardProps) {
  return (
    <button
      onClick={() => onSelect(f.id)}
      className="glass-card p-4 text-left hover:border-primary/50 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold">{competenciaLabel(f.competencia_mes)}</p>
          <p className="text-xs text-muted-foreground">{referenciaFolha(f.competencia_mes)}</p>
        </div>
        <Badge className={STATUS_COLORS[f.status]}>{f.status}</Badge>
      </div>
      <p className="text-2xl font-bold">{formatCurrency(Number(f.total_geral))}</p>
      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
        <div>Funcionários: {formatCurrency(Number(f.total_funcionarios))}</div>
        <div>Encargos: {formatCurrency(Number(f.total_encargos))}</div>
        {Math.abs(Number(f.diferenca_conferencia)) > 0.5 && (
          <div className="text-warning">Diferença: {formatCurrency(Number(f.diferenca_conferencia))}</div>
        )}
      </div>
    </button>
  );
});
