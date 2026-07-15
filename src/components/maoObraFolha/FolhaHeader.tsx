import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Calculator, Sparkles } from "lucide-react";
import type { FolhaResumo } from "@/lib/folhaMaoObra";
import type { Folha } from "./types";

interface FolhaHeaderProps {
  mesRef: string;
  onMesRefChange: (v: string) => void;
  folha: FolhaResumo;
  folhaLancada: Folha | undefined;
  usarEstimativa: boolean;
  onLancar: () => void;
}

export function FolhaHeader({
  mesRef,
  onMesRefChange,
  folha,
  folhaLancada,
  usarEstimativa,
  onLancar,
}: FolhaHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Label className="text-sm">Mês:</Label>
        <Input
          type="month"
          value={mesRef}
          onChange={(e) => onMesRefChange(e.target.value)}
          className="w-44"
        />
        {folhaLancada && (
          <Badge className="badge-success gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Encargos lançados
          </Badge>
        )}
        {!folhaLancada && usarEstimativa && folha.itens.length > 0 && (
          <Badge variant="outline" className="gap-1 text-warning border-warning/40">
            <Sparkles className="w-3 h-3" />
            Estimativa (sem registros)
          </Badge>
        )}
      </div>
      <Button
        size="sm"
        onClick={onLancar}
        disabled={!!folhaLancada || folha.total_fgts + folha.total_inss === 0}
        className="gap-1.5"
      >
        <Calculator className="w-4 h-4" />
        Lançar encargos do mês
      </Button>
    </div>
  );
}
