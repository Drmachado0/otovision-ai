import { memo } from "react";
import { HardHat, Phone, DollarSign, Clock, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Trabalhador } from "./types";

interface TrabalhadorCardProps {
  trabalhador: Trabalhador;
  onOpenDetail: (t: Trabalhador) => void;
  onEdit: (t: Trabalhador) => void;
  onToggleAtivo: (t: Trabalhador) => void;
}

export const TrabalhadorCard = memo(function TrabalhadorCard({
  trabalhador: t,
  onOpenDetail,
  onEdit,
  onToggleAtivo,
}: TrabalhadorCardProps) {
  return (
    <div
      className="glass-card-interactive p-5 space-y-3 animate-fade-in-up cursor-pointer"
      onClick={() => onOpenDetail(t)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold truncate">{t.nome}</h3>
          {t.funcao && (
            <Badge variant="secondary" className="mt-1 text-xs">
              <HardHat className="w-3 h-3 mr-1" />
              {t.funcao}
            </Badge>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge className={t.ativo ? "badge-success" : "badge-muted"}>
            {t.ativo ? "Ativo" : "Inativo"}
          </Badge>
          {t.incide_encargos && (
            <Badge variant="outline" className="text-[10px]">
              FGTS+INSS
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-1.5 text-sm text-muted-foreground">
        {t.telefone && (
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5" />
            <span>{t.telefone}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <DollarSign className="w-3.5 h-3.5" />
          <span className="font-medium text-foreground">
            {formatCurrency(t.valor_diaria ?? 0)}
          </span>
          <span className="text-xs">/diária</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          <Badge variant="outline" className="text-xs">
            {t.tipo_contrato || "Diária"}
          </Badge>
        </div>
      </div>

      <div
        className="flex items-center gap-2 pt-1 border-t border-border/50"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(t)}
          className="gap-1 text-xs"
        >
          <Pencil className="w-3.5 h-3.5" />
          Editar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleAtivo(t)}
          className="gap-1 text-xs"
        >
          {t.ativo ? (
            <>
              <ToggleRight className="w-3.5 h-3.5" />
              Desativar
            </>
          ) : (
            <>
              <ToggleLeft className="w-3.5 h-3.5" />
              Ativar
            </>
          )}
        </Button>
      </div>
    </div>
  );
});
