import {
  Percent, CheckCircle, Clock, DollarSign, TrendingUp, Calendar,
  AlertTriangle, ArrowUp, ArrowDown,
} from "lucide-react";
import { formatCurrency, formatMes } from "@/lib/formatters";
import { Progress } from "@/components/ui/progress";
import { PERCENTUAL_COMISSAO, type ComissaoRow } from "./types";

interface Agg {
  totalGasto: number;
  comissaoPaga: number;
  comissaoPendente: number;
  comissaoTotal: number;
  comissaoTeorica: number;
  porMes: Record<string, { pago: number; pendente: number; total: number; count: number; gastosMes: number }>;
  mediaMensal: number;
  mesMaior: string;
  mesMenor: string;
  ticketMedio: number;
  valorMesAtual: number;
  valorMesAnterior: number;
  variacaoMes: number;
  previsaoProx: number;
  pendentesAtrasados: number;
}

interface ComissaoKpisProps {
  agg: Agg;
  comissoes: ComissaoRow[];
}

export function ComissaoKpis({ agg, comissoes }: ComissaoKpisProps) {
  return (
    <>
      {/* KPIs principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="stat-card-primary p-5 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground uppercase">Comissão Total</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(agg.comissaoTotal)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            8% sobre {formatCurrency(agg.totalGasto)} de gastos
          </p>
        </div>

        <div className="stat-card-success p-5 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-success" />
            <span className="text-xs text-muted-foreground uppercase">Pago</span>
          </div>
          <p className="text-2xl font-bold text-success">{formatCurrency(agg.comissaoPaga)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {comissoes.filter(c => c.pago).length} lançamento(s) ·{" "}
            {agg.comissaoTotal > 0 ? `${((agg.comissaoPaga / agg.comissaoTotal) * 100).toFixed(1)}%` : "0%"} do total
          </p>
        </div>

        <div className="stat-card-warning p-5 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-warning" />
            <span className="text-xs text-muted-foreground uppercase">Pendente</span>
          </div>
          <p className="text-2xl font-bold text-warning">{formatCurrency(agg.comissaoPendente)}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[11px] text-muted-foreground">
              {comissoes.filter(c => !c.pago).length} lançamento(s)
            </p>
            {agg.pendentesAtrasados > 0 && (
              <span className="badge-danger text-[9px] inline-flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5" /> {agg.pendentesAtrasados} atrasado(s)
              </span>
            )}
          </div>
        </div>

        <div className="stat-card-info p-5 animate-fade-in-up" style={{ animationDelay: "180ms" }}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-info" />
            <span className="text-xs text-muted-foreground uppercase">Este Mês</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(agg.valorMesAtual)}</p>
          <p className="text-[11px] mt-1 flex items-center gap-1">
            {agg.valorMesAnterior > 0 ? (
              <>
                <span className={agg.variacaoMes >= 0 ? "text-warning" : "text-success"}>
                  {agg.variacaoMes >= 0 ? "▲" : "▼"} {Math.abs(agg.variacaoMes).toFixed(1)}%
                </span>
                <span className="text-muted-foreground">vs mês anterior ({formatCurrency(agg.valorMesAnterior)})</span>
              </>
            ) : (
              <span className="text-muted-foreground">sem comparativo</span>
            )}
          </p>
        </div>
      </div>

      {/* KPIs secundários */}
      <div className="glass-card p-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
        {[
          { icon: <TrendingUp className="w-3.5 h-3.5" />, label: "Média Mensal", value: formatCurrency(agg.mediaMensal) },
          { icon: <ArrowUp className="w-3.5 h-3.5 text-success" />, label: "Mês Maior", value: agg.mesMaior ? `${formatMes(agg.mesMaior)} · ${formatCurrency(agg.porMes[agg.mesMaior].total)}` : "—" },
          { icon: <ArrowDown className="w-3.5 h-3.5 text-warning" />, label: "Mês Menor", value: agg.mesMenor ? `${formatMes(agg.mesMenor)} · ${formatCurrency(agg.porMes[agg.mesMenor].total)}` : "—" },
          { icon: <DollarSign className="w-3.5 h-3.5" />, label: "Ticket Médio", value: formatCurrency(agg.ticketMedio) },
          { icon: <Calendar className="w-3.5 h-3.5 text-info" />, label: "Previsão Próx. Mês", value: formatCurrency(agg.previsaoProx) },
        ].map(k => (
          <div key={k.label} className="px-2">
            <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground uppercase mb-1">
              {k.icon} {k.label}
            </div>
            <p className="text-sm font-semibold truncate">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar de quitação */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Quitação da Comissão</span>
          <span className="text-sm font-bold text-primary">
            {agg.comissaoTotal > 0 ? `${((agg.comissaoPaga / agg.comissaoTotal) * 100).toFixed(1)}%` : "0%"}
          </span>
        </div>
        <Progress value={agg.comissaoTotal > 0 ? Math.min((agg.comissaoPaga / agg.comissaoTotal) * 100, 100) : 0} className="h-3" />
        <p className="text-[11px] text-muted-foreground mt-2">
          Referência teórica ({PERCENTUAL_COMISSAO}% sobre {formatCurrency(agg.totalGasto)}) ={" "}
          <span className="font-medium text-foreground">{formatCurrency(agg.comissaoTeorica)}</span>
          {agg.comissaoTotal < agg.comissaoTeorica && (
            <> · faltam <span className="text-warning font-medium">{formatCurrency(agg.comissaoTeorica - agg.comissaoTotal)}</span> de comissões a registrar</>
          )}
        </p>
      </div>
    </>
  );
}
