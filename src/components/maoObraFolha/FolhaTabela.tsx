import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/formatters";
import type { FolhaResumo, FolhaItemExtras } from "@/lib/folhaMaoObra";
import { EXTRA_FIELDS } from "./types";

interface FolhaTabelaProps {
  folha: FolhaResumo;
  mesRef: string;
  onUpdateExtra: (
    trabalhadorId: string,
    field: keyof FolhaItemExtras,
    value: number,
  ) => void;
}

export function FolhaTabela({ folha, mesRef, onUpdateExtra }: FolhaTabelaProps) {
  return (
    <div className="glass-card overflow-hidden">
      {folha.itens.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          Nenhum trabalhador ativo para {mesRef}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30 uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Trabalhador</th>
                <th className="text-right px-2 py-2">Dias</th>
                <th className="text-right px-2 py-2">Bruto</th>
                {EXTRA_FIELDS.map((f) => (
                  <th key={f.key} className="text-right px-2 py-2">{f.label}</th>
                ))}
                <th className="text-right px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {folha.itens.map((i) => (
                <tr key={i.trabalhador_id} className="border-t border-border/40">
                  <td className="px-3 py-1.5">
                    <div className="font-medium">{i.nome}</div>
                    <div className="text-muted-foreground text-[11px]">{i.funcao || "-"}</div>
                  </td>
                  <td className="px-2 py-1.5 text-right">{i.dias}</td>
                  <td className="px-2 py-1.5 text-right">{formatCurrency(i.bruto)}</td>
                  {EXTRA_FIELDS.map((f) => (
                    <td key={f.key} className="px-1 py-1 text-right">
                      <Input
                        type="number"
                        step="0.01"
                        value={(i[f.key] as number) || ""}
                        onChange={(e) =>
                          onUpdateExtra(i.trabalhador_id, f.key, Number(e.target.value) || 0)
                        }
                        className="h-7 w-20 text-right text-xs px-1.5"
                        placeholder="0"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-right font-semibold">
                    {formatCurrency(i.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/20 font-semibold">
              <tr>
                <td className="px-3 py-2 text-right" colSpan={2}>Subtotais</td>
                <td className="px-2 py-2 text-right">{formatCurrency(folha.total_diarias)}</td>
                <td className="px-2 py-2 text-right">{formatCurrency(folha.total_fgts)}</td>
                <td className="px-2 py-2 text-right">{formatCurrency(folha.total_inss)}</td>
                <td className="px-2 py-2 text-right">{formatCurrency(folha.total_quinzena)}</td>
                <td className="px-2 py-2 text-right">{formatCurrency(folha.total_vales)}</td>
                <td className="px-2 py-2 text-right">{formatCurrency(folha.total_vale_alim)}</td>
                <td className="px-2 py-2 text-right">{formatCurrency(folha.total_encerramento)}</td>
                <td className="px-2 py-2 text-right">{formatCurrency(folha.total_ferias)}</td>
                <td className="px-2 py-2 text-right">{formatCurrency(folha.total_horas_extras)}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(folha.total_geral)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
