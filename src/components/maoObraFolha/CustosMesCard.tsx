import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/formatters";
import type { FolhaResumo } from "@/lib/folhaMaoObra";

interface CustosMesCardProps {
  folha: FolhaResumo;
  custosEng: number;
  exames: number;
  totalGeralMes: number;
  onCustosEngChange: (v: number) => void;
  onExamesChange: (v: number) => void;
  onCustosBlur: (kind: "eng" | "exames") => void;
}

export function CustosMesCard({
  folha,
  custosEng,
  exames,
  totalGeralMes,
  onCustosEngChange,
  onExamesChange,
  onCustosBlur,
}: CustosMesCardProps) {
  return (
    <div className="glass-card p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Custos adicionais do mês</h3>
        <p className="text-xs text-muted-foreground">
          Lançamentos que não pertencem a um trabalhador específico
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Custos Engenharia</Label>
          <Input
            type="number"
            step="0.01"
            value={custosEng || ""}
            onChange={(e) => onCustosEngChange(Number(e.target.value) || 0)}
            onBlur={() => onCustosBlur("eng")}
            placeholder="0,00"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Exames Funcionários</Label>
          <Input
            type="number"
            step="0.01"
            value={exames || ""}
            onChange={(e) => onExamesChange(Number(e.target.value) || 0)}
            onBlur={() => onCustosBlur("exames")}
            placeholder="0,00"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Subtotal Folha</Label>
          <div className="h-10 flex items-center px-3 rounded-md border border-border/40 bg-muted/20 text-sm">
            {formatCurrency(folha.total_geral)}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-primary">TOTAL GERAL</Label>
          <div className="h-10 flex items-center px-3 rounded-md border border-primary/40 bg-primary/10 text-sm font-bold text-primary">
            {formatCurrency(totalGeralMes)}
          </div>
        </div>
      </div>
    </div>
  );
}
