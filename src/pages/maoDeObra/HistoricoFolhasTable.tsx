import { formatCurrency } from "@/lib/formatters";
import type { Folha } from "./types";

interface HistoricoFolhasTableProps {
  folhas: Folha[];
}

export function HistoricoFolhasTable({ folhas }: HistoricoFolhasTableProps) {
  return (
    <div className="glass-card p-4 space-y-2">
      <h3 className="text-sm font-semibold mb-2">Folhas lançadas</h3>
      {folhas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma folha lançada ainda.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-2 py-1">Mês</th>
                <th className="text-right px-2 py-1">Diárias</th>
                <th className="text-right px-2 py-1">FGTS</th>
                <th className="text-right px-2 py-1">INSS</th>
                <th className="text-right px-2 py-1">Extras</th>
                <th className="text-right px-2 py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {folhas.map((f) => {
                const extras =
                  Number(f.total_quinzena ?? 0) +
                  Number(f.total_vales ?? 0) +
                  Number(f.total_vale_alim ?? 0) +
                  Number(f.total_encerramento ?? 0) +
                  Number(f.total_ferias ?? 0) +
                  Number(f.total_horas_extras ?? 0);
                const total =
                  Number(f.total_geral ?? 0) ||
                  Number(f.total_diarias) + Number(f.total_fgts) + Number(f.total_inss) + extras;
                return (
                  <tr key={f.id} className="border-t border-border/40">
                    <td className="px-2 py-1 font-medium">{f.mes_ref}</td>
                    <td className="px-2 py-1 text-right">{formatCurrency(Number(f.total_diarias))}</td>
                    <td className="px-2 py-1 text-right text-warning">{formatCurrency(Number(f.total_fgts))}</td>
                    <td className="px-2 py-1 text-right text-info">{formatCurrency(Number(f.total_inss))}</td>
                    <td className="px-2 py-1 text-right text-accent-foreground">{formatCurrency(extras)}</td>
                    <td className="px-2 py-1 text-right font-semibold">{formatCurrency(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
