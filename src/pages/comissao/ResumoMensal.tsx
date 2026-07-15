import { CheckCircle, Clock, ChevronDown, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { parseObservacoes } from "@/components/ComissaoDetailDrawer";
import type { ComissaoRow } from "./types";

interface SerieMensalItem {
  mes: string;
  mesLabel: string;
  pago: number;
  pendente: number;
  total: number;
  count: number;
}

interface ResumoMensalProps {
  serieMensal: SerieMensalItem[];
  comissoes: ComissaoRow[];
  expandedMonths: Set<string>;
  onToggleMonth: (m: string) => void;
  onSelect: (c: ComissaoRow) => void;
}

export function ResumoMensal({
  serieMensal,
  comissoes,
  expandedMonths,
  onToggleMonth,
  onSelect,
}: ResumoMensalProps) {
  return (
    <div className="glass-card p-5">
      <h2 className="text-sm font-semibold mb-4">Resumo mensal</h2>
      {serieMensal.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Sem meses para exibir</p>
      ) : (
        <div className="space-y-1.5">
          <div className="grid grid-cols-12 gap-2 text-[10px] uppercase text-muted-foreground px-3 pb-2 border-b border-border/50">
            <div className="col-span-3">Mês</div>
            <div className="col-span-1 text-center">Lanç.</div>
            <div className="col-span-2 text-right">Pago</div>
            <div className="col-span-2 text-right">Pendente</div>
            <div className="col-span-2 text-right">Total</div>
            <div className="col-span-2 text-right">Quitado</div>
          </div>
          {[...serieMensal].reverse().map(m => {
            const isOpen = expandedMonths.has(m.mes);
            const pct = m.total > 0 ? (m.pago / m.total) * 100 : 0;
            const lancamentosDoMes = comissoes.filter(c => c.mes === m.mes);
            return (
              <div key={m.mes} className="rounded-lg border border-border/40 overflow-hidden">
                <button
                  onClick={() => onToggleMonth(m.mes)}
                  className="w-full grid grid-cols-12 gap-2 items-center px-3 py-2.5 text-sm hover:bg-accent/30 transition-colors"
                >
                  <div className="col-span-3 flex items-center gap-1.5 font-medium">
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    {m.mesLabel}
                  </div>
                  <div className="col-span-1 text-center text-muted-foreground">{m.count}</div>
                  <div className="col-span-2 text-right text-success">{formatCurrency(m.pago)}</div>
                  <div className="col-span-2 text-right text-warning">{formatCurrency(m.pendente)}</div>
                  <div className="col-span-2 text-right font-bold">{formatCurrency(m.total)}</div>
                  <div className="col-span-2 text-right text-xs">
                    <span className={pct >= 100 ? "text-success font-medium" : "text-muted-foreground"}>{pct.toFixed(0)}%</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="bg-background/40 border-t border-border/30 px-3 py-2 space-y-1">
                    {lancamentosDoMes.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">Sem lançamentos neste mês.</p>
                    ) : lancamentosDoMes.map(c => {
                      const parsed = parseObservacoes(c.observacoes);
                      return (
                        <div
                          key={c.id}
                          onClick={() => onSelect(c)}
                          className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-accent/40 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {c.pago
                              ? <CheckCircle className="w-3 h-3 text-success shrink-0" />
                              : <Clock className="w-3 h-3 text-warning shrink-0" />}
                            <span className="truncate">{c.observacoes || c.fornecedor || parsed.fornecedor || "Sem descrição"}</span>
                          </div>
                          <span className="font-semibold ml-2">{formatCurrency(Number(c.valor))}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
