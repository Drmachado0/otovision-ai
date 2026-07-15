import { CheckCircle, Search } from "lucide-react";
import { formatMes } from "@/lib/formatters";
import { Input } from "@/components/ui/input";
import { ComissaoRowItem } from "./ComissaoRowItem";
import type { ComissaoRow, SortField, SortDir } from "./types";

interface DetalhamentoPagamentosProps {
  filtered: ComissaoRow[];
  selectedIds: Set<string>;
  selectedPendentesCount: number;
  mesesParaFiltro: string[];
  busca: string;
  onBuscaChange: (v: string) => void;
  filtroMes: string;
  onFiltroMesChange: (v: string) => void;
  filtroOrigem: string;
  onFiltroOrigemChange: (v: string) => void;
  filtroStatus: "todos" | "pago" | "pendente";
  onFiltroStatusChange: (v: "todos" | "pago" | "pendente") => void;
  sortField: SortField;
  sortDir: SortDir;
  onToggleSort: (f: SortField) => void;
  onBulkPay: () => void;
  onToggleSelect: (id: string) => void;
  onSelect: (c: ComissaoRow) => void;
  onQuickDelete: (c: ComissaoRow) => void;
}

export function DetalhamentoPagamentos({
  filtered,
  selectedIds,
  selectedPendentesCount,
  mesesParaFiltro,
  busca,
  onBuscaChange,
  filtroMes,
  onFiltroMesChange,
  filtroOrigem,
  onFiltroOrigemChange,
  filtroStatus,
  onFiltroStatusChange,
  sortField,
  sortDir,
  onToggleSort,
  onBulkPay,
  onToggleSelect,
  onSelect,
  onQuickDelete,
}: DetalhamentoPagamentosProps) {
  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-sm font-semibold">Detalhamento de Pagamentos ({filtered.length})</h2>
        {selectedPendentesCount > 0 && (
          <button
            onClick={onBulkPay}
            className="px-3 py-1.5 rounded-lg bg-success text-success-foreground text-xs font-medium flex items-center gap-1.5 hover:bg-success/90 transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Marcar {selectedPendentesCount} como pagas
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar fornecedor, descrição..."
            value={busca}
            onChange={e => onBuscaChange(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <select
          value={filtroMes}
          onChange={e => onFiltroMesChange(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="todos">Todos os meses</option>
          {mesesParaFiltro.map(m => <option key={m} value={m}>{formatMes(m)}</option>)}
        </select>
        <select
          value={filtroOrigem}
          onChange={e => onFiltroOrigemChange(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="todos">Todas as origens</option>
          <option value="NF">NF</option>
          <option value="Orçamento">Orçamento</option>
          <option value="Compra">Compra</option>
          <option value="Manual">Manual</option>
        </select>
        <div className="flex gap-1">
          {(["todos", "pago", "pendente"] as const).map(f => (
            <button
              key={f}
              onClick={() => onFiltroStatusChange(f)}
              className={`flex-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                filtroStatus === f ? "bg-primary text-primary-foreground" : "bg-accent/50 text-muted-foreground hover:bg-accent"
              }`}
            >
              {f === "todos" ? "Todos" : f === "pago" ? "Pagos" : "Pendentes"}
            </button>
          ))}
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>Ordenar por:</span>
        <button
          onClick={() => onToggleSort("data")}
          className={`px-2 py-0.5 rounded ${sortField === "data" ? "bg-accent text-foreground" : ""}`}
        >
          Data {sortField === "data" && (sortDir === "asc" ? "↑" : "↓")}
        </button>
        <button
          onClick={() => onToggleSort("valor")}
          className={`px-2 py-0.5 rounded ${sortField === "valor" ? "bg-accent text-foreground" : ""}`}
        >
          Valor {sortField === "valor" && (sortDir === "asc" ? "↑" : "↓")}
        </button>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum lançamento encontrado</p>
      ) : (
        <div className="space-y-1">
          {filtered.map((c, i) => (
            <ComissaoRowItem
              key={c.id}
              comissao={c}
              index={i}
              isSelected={selectedIds.has(c.id)}
              onToggleSelect={onToggleSelect}
              onSelect={onSelect}
              onQuickDelete={onQuickDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
