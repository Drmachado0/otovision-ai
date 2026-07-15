import { DollarSign, TrendingDown, Wallet, Activity, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface MainKpisProps {
  orcamentoTotal: number;
  totalGasto: number;
  saldo: number;
  totalEntradas: number;
  percentual: number;
}

export function MainKpis({ orcamentoTotal, totalGasto, saldo, totalEntradas, percentual }: MainKpisProps) {
  return (
    <>
      {/* Main KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { variant: "info" as const, label: "Orçamento Total", value: formatCurrency(orcamentoTotal), icon: <DollarSign className="w-5 h-5" />, to: "/configuracoes" },
          { variant: "danger" as const, label: "Total Gasto", value: formatCurrency(totalGasto), icon: <TrendingDown className="w-5 h-5" />, sub: `${formatPercent(percentual)} executado`, to: "/fluxo", tooltip: "Soma de todas as saídas (pagas + parcelas pendentes). Lançamentos da categoria \"Ajuste de saldo\" NÃO são contabilizados aqui — eles afetam apenas o saldo da conta correspondente." },
          { variant: "success" as const, label: "Saldo do Orçamento", value: formatCurrency(saldo), icon: <Wallet className="w-5 h-5" />, to: "/relatorios", tooltip: "Orçamento Total − Total Gasto. Lançamentos da categoria \"Ajuste de saldo\" não impactam este cálculo, pois alteram apenas o saldo das contas bancárias, não o orçamento da obra." },
          { variant: "warning" as const, label: "Total Entradas", value: formatCurrency(totalEntradas), icon: <Activity className="w-5 h-5" />, to: "/fluxo", tooltip: "Saldo inicial das contas ativas + entradas operacionais. Lançamentos da categoria \"Ajuste de saldo\" NÃO entram neste total — são apenas correções contábeis no saldo da conta." },
        ].map((card, i) => (
          <StatCard key={card.label} {...card} delay={i * 100} />
        ))}
      </div>

      {/* Nota explicativa sobre Ajuste de saldo */}
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50 text-xs text-muted-foreground animate-fade-in-up" style={{ animationDelay: "350ms" }}>
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary/70" />
        <span>
          Lançamentos da categoria <span className="font-medium text-foreground">"Ajuste de saldo"</span> afetam apenas o saldo da conta correspondente — não são contabilizados em <span className="font-medium text-foreground">Total Gasto</span> nem em <span className="font-medium text-foreground">Total Entradas</span>.
        </span>
      </div>
    </>
  );
}

function StatCard({ variant, label, value, icon, sub, delay = 0, to, tooltip }: {
  variant: "success" | "danger" | "info" | "warning";
  label: string; value: string; icon: React.ReactNode; sub?: string; delay?: number; to?: string; tooltip?: string;
}) {
  const classes = { success: "stat-card-success", danger: "stat-card-danger", info: "stat-card-info", warning: "stat-card-warning" };
  const iconColor = { success: "text-success", danger: "text-destructive", info: "text-info", warning: "text-warning" };
  const inner = (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  aria-label={`Sobre ${label}`}
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className={iconColor[variant]}>{icon}</div>
      </div>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </>
  );
  const className = `${classes[variant]} p-5 animate-fade-in-up ${to ? "hover:bg-accent/30 transition-colors block" : ""}`;
  const style = { animationDelay: `${delay}ms` };
  return to ? (
    <Link to={to} className={className} style={style}>{inner}</Link>
  ) : (
    <div className={className} style={style}>{inner}</div>
  );
}
