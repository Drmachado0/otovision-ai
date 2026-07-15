import { formatPercent } from "@/lib/formatters";

interface BudgetProgressProps {
  percentual: number;
}

export function BudgetProgress({ percentual }: BudgetProgressProps) {
  return (
    <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: "900ms" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">Progresso do Orçamento</span>
        <span className="text-sm font-bold text-primary">{formatPercent(Math.min(percentual, 100))}</span>
      </div>
      <div className="h-3 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            percentual > 100 ? "bg-destructive" : percentual > 80 ? "bg-warning" : "bg-primary"
          }`}
          style={{ width: `${Math.min(percentual, 100)}%` }}
        />
      </div>
    </div>
  );
}
