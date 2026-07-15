import { memo } from "react";
import { CheckCircle, Clock, Trash2, AlertTriangle } from "lucide-react";
import { formatCurrency, formatMes } from "@/lib/formatters";
import { Checkbox } from "@/components/ui/checkbox";
import { parseObservacoes } from "@/components/ComissaoDetailDrawer";
import { OrigemBadgeSmall } from "./OrigemBadgeSmall";
import { PERCENTUAL_COMISSAO, type ComissaoRow } from "./types";

interface ComissaoRowItemProps {
  comissao: ComissaoRow;
  index: number;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onSelect: (c: ComissaoRow) => void;
  onQuickDelete: (c: ComissaoRow) => void;
}

export const ComissaoRowItem = memo(function ComissaoRowItem({
  comissao: c,
  index: i,
  isSelected,
  onToggleSelect,
  onSelect,
  onQuickDelete,
}: ComissaoRowItemProps) {
  const parsed = parseObservacoes(c.observacoes);
  const displayFornecedor = c.fornecedor || parsed.fornecedor;
  const valorBase = Number(c.valor) / (PERCENTUAL_COMISSAO / 100);
  const limite = new Date();
  limite.setDate(limite.getDate() - 30);
  const limiteMes = `${limite.getFullYear()}-${String(limite.getMonth() + 1).padStart(2, "0")}`;
  const atrasado = !c.pago && c.mes && c.mes < limiteMes;

  return (
    <div
      className={`flex items-center justify-between py-3 px-3 rounded-lg transition-colors animate-fade-in-up ${
        isSelected ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-accent/50"
      }`}
      style={{ animationDelay: `${Math.min(i * 20, 400)}ms` }}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(c.id)}
          onClick={(e) => e.stopPropagation()}
        />
        <div
          onClick={() => onSelect(c)}
          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${c.pago ? "bg-success/10" : "bg-warning/10"}`}>
            {c.pago ? <CheckCircle className="w-4 h-4 text-success" /> : <Clock className="w-4 h-4 text-warning" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium truncate">
                {c.observacoes || c.mes || "Sem referência"}
              </p>
              <OrigemBadgeSmall obs={c.observacoes} />
              {atrasado && (
                <span className="badge-danger text-[9px] inline-flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" /> Atrasado
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {displayFornecedor && (
                <span className="text-[11px] text-muted-foreground truncate max-w-[160px]">{displayFornecedor}</span>
              )}
              {c.mes && <span className="text-[10px] text-muted-foreground/60">· {formatMes(c.mes)}</span>}
              {c.pago
                ? <span className="badge-success text-[9px]">Pago</span>
                : <span className="badge-warning text-[9px]">Pendente</span>}
              {c.auto && <span className="badge-info text-[9px]">Auto</span>}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        <div className="text-right">
          <p className="text-sm font-bold">{formatCurrency(Number(c.valor))}</p>
          <p className="text-[10px] text-muted-foreground">de {formatCurrency(valorBase)}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onQuickDelete(c); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});
