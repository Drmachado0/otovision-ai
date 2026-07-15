import { Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PreferenciasSectionProps {
  comissaoRate: string;
  setComissaoRate: (value: string) => void;
}

export function PreferenciasSection({ comissaoRate, setComissaoRate }: PreferenciasSectionProps) {
  return (
    <section className="glass-card p-6 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Settings className="w-5 h-5 text-primary" /> Preferências
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Taxa de Comissão (%)</Label>
          <Input
            type="number"
            step="0.5"
            min="0"
            max="100"
            value={comissaoRate}
            onChange={e => setComissaoRate(e.target.value)}
            className="mt-1 max-w-[120px]"
          />
          <p className="text-xs text-muted-foreground mt-1">Usado no cálculo automático de comissão</p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Moeda</Label>
          <Input value="BRL (R$)" disabled className="mt-1 max-w-[160px]" />
        </div>
      </div>
    </section>
  );
}
