import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SistemaInfoSectionProps {
  role: string | null;
  email?: string;
}

export function SistemaInfoSection({ role, email }: SistemaInfoSectionProps) {
  return (
    <section className="glass-card p-6 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Info className="w-5 h-5 text-primary" /> Informações do Sistema
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-3 rounded-lg bg-secondary/30">
          <p className="text-xs text-muted-foreground">Versão</p>
          <p className="text-sm font-medium">OTOVISION v1.0</p>
        </div>
        <div className="p-3 rounded-lg bg-secondary/30">
          <p className="text-xs text-muted-foreground">Seu Perfil</p>
          <Badge className="text-xs mt-1">{role || "carregando..."}</Badge>
        </div>
        <div className="p-3 rounded-lg bg-secondary/30">
          <p className="text-xs text-muted-foreground">Email</p>
          <p className="text-sm font-medium truncate">{email || "-"}</p>
        </div>
      </div>
    </section>
  );
}
