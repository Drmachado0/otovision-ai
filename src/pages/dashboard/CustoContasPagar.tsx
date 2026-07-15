import { Link } from "react-router-dom";
import { ArrowRight, Ruler, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface CustoContasPagarProps {
  custoM2: number;
  areaConstruida: number;
  contasPagar: { total: number; count: number; vencidas: number };
}

export function CustoContasPagar({ custoM2, areaConstruida, contasPagar }: CustoContasPagarProps) {
  return (
    <div className={`grid grid-cols-1 gap-4 ${contasPagar.count > 0 ? "md:grid-cols-2" : ""}`}>
      {/* Custo/m² */}
      <Link
        to="/relatorios"
        className="group relative overflow-hidden glass-card p-5 animate-fade-in-up hover:bg-accent/20 transition-all hover:-translate-y-0.5"
        style={{ animationDelay: "400ms" }}
      >
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-primary/40" />
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/10 blur-2xl group-hover:bg-primary/20 transition-colors" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15 ring-1 ring-primary/30">
                <Ruler className="w-4 h-4 text-primary" />
              </span>
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.14em]">Custo / m²</span>
            </div>
            <p className="text-3xl font-bold tracking-tight text-foreground">{formatCurrency(custoM2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {areaConstruida > 0 ? `${areaConstruida} m² construídos` : "Defina a área em Configurações"}
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </Link>

      {/* Contas a Pagar */}
      {contasPagar.count > 0 && (
        <Link
          to="/contas-pagar"
          className="group relative overflow-hidden glass-card p-5 animate-fade-in-up hover:bg-accent/20 transition-all hover:-translate-y-0.5"
          style={{ animationDelay: "500ms" }}
        >
          <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-warning to-warning/40" />
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-warning/10 blur-2xl group-hover:bg-warning/20 transition-colors" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-warning/15 ring-1 ring-warning/30">
                  <Clock className="w-4 h-4 text-warning" />
                </span>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.14em]">Contas a Pagar</span>
              </div>
              <p className="text-3xl font-bold tracking-tight text-warning">{formatCurrency(contasPagar.total)}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-warning/10 text-warning ring-1 ring-warning/20">
                  {contasPagar.count} pendente{contasPagar.count > 1 ? "s" : ""}
                </span>
                {contasPagar.vencidas > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-destructive/10 text-destructive ring-1 ring-destructive/20">
                    {contasPagar.vencidas} vencida{contasPagar.vencidas > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground/60 group-hover:text-warning group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
      )}
    </div>
  );
}
