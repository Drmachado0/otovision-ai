import { formatCurrency } from "@/lib/formatters";

interface FluxoCaixaKPIsProps {
  totalEntradas: number;
  totalSaidas: number;
  saidasPagas: number;
  saidasPendentes: number;
  saldoInicial: number;
  entradasOperacionais: number;
}

export function FluxoCaixaKPIs({
  totalEntradas,
  totalSaidas,
  saidasPagas,
  saidasPendentes,
  saldoInicial,
  entradasOperacionais,
}: FluxoCaixaKPIsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="stat-card-success p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Entradas</p>
        <p className="text-lg font-bold mt-1 text-success">{formatCurrency(totalEntradas)}</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Saldo inicial: {formatCurrency(saldoInicial)} · Operacionais: {formatCurrency(entradasOperacionais)}
        </p>
      </div>
      <div className="stat-card-danger p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Saídas</p>
        <p className="text-lg font-bold mt-1 text-destructive">{formatCurrency(totalSaidas)}</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Pagas: {formatCurrency(saidasPagas)} · Pendentes: {formatCurrency(saidasPendentes)}
        </p>
      </div>
      <div className="stat-card-info p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Saldo</p>
        <p className={`text-lg font-bold mt-1 ${totalEntradas - totalSaidas >= 0 ? "text-success" : "text-destructive"}`}>
          {formatCurrency(totalEntradas - totalSaidas)}
        </p>
      </div>
    </div>
  );
}
