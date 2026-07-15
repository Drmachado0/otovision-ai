import { memo } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS, getDisplayStatus, type Orcamento } from "./types";

interface OrcamentoRowProps {
  orcamento: Orcamento;
  onSelect: (o: Orcamento) => void;
  onDelete: (id: string) => void;
}

export const OrcamentoRow = memo(function OrcamentoRow({
  orcamento: o,
  onSelect,
  onDelete,
}: OrcamentoRowProps) {
  const displayStatus = getDisplayStatus(o);
  return (
    <tr className="table-row-interactive cursor-pointer border-b border-border/20" onClick={() => onSelect(o)}>
      <td className="px-4 py-3">
        <span className="font-medium">{o.fornecedor || "-"}</span>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-muted-foreground truncate max-w-[200px] block">{o.descricao || "-"}</span>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="text-xs text-muted-foreground">{o.categoria || "-"}</span>
      </td>
      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(Number(o.valor_total))}</td>
      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{formatDate(o.data)}</td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className={displayStatus === "Vencido" ? "text-destructive font-medium" : "text-muted-foreground"}>
          {o.validade ? formatDate(o.validade) : "-"}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <Badge className={`text-xs ${STATUS_COLORS[displayStatus] || "badge-muted"}`}>
          {displayStatus === "Vencido" && <AlertTriangle className="w-3 h-3 mr-1" />}
          {displayStatus}
        </Badge>
      </td>
      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(o.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </td>
    </tr>
  );
});
