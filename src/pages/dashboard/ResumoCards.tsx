import { Link } from "react-router-dom";
import { ShoppingCart, Receipt, Landmark } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import type { ContaRow } from "./types";

interface ResumoCardsProps {
  comprasAPagar: number;
  comprasPendentes: number;
  comprasTotal: number;
  comissoesPendentes: number;
  contas: ContaRow[];
  allTransForContas: { tipo: string; valor: number; categoria: string; conta_id?: string }[];
}

export function ResumoCards({
  comprasAPagar,
  comprasPendentes,
  comprasTotal,
  comissoesPendentes,
  contas,
  allTransForContas,
}: ResumoCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Compras */}
      <Link to="/compras" className="glass-card p-4 hover:bg-accent/30 transition-colors animate-fade-in-up" style={{ animationDelay: "750ms" }}>
        <div className="flex items-center gap-2 mb-2">
          <ShoppingCart className="w-4 h-4 text-primary" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Compras a Pagar</span>
        </div>
        <p className="text-lg font-bold">{formatCurrency(comprasAPagar)}</p>
        <p className="text-[10px] text-muted-foreground">
          {comprasPendentes} pendente(s) · {formatCurrency(comprasTotal)} compromissado
        </p>
      </Link>

      {/* Comissões */}
      <Link to="/comissao" className="glass-card p-4 hover:bg-accent/30 transition-colors animate-fade-in-up" style={{ animationDelay: "800ms" }}>
        <div className="flex items-center gap-2 mb-2">
          <Receipt className="w-4 h-4 text-warning" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Comissões a Pagar</span>
        </div>
        <p className={`text-lg font-bold ${comissoesPendentes > 0 ? "text-warning" : ""}`}>{formatCurrency(comissoesPendentes)}</p>
        <p className="text-[10px] text-muted-foreground">pendente de pagamento</p>
      </Link>

      {/* Contas */}
      <Link to="/contas" className="glass-card p-4 hover:bg-accent/30 transition-colors animate-fade-in-up" style={{ animationDelay: "850ms" }}>
        <div className="flex items-center gap-2 mb-2">
          <Landmark className="w-4 h-4 text-info" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Contas Ativas</span>
        </div>
        <div className="space-y-1">
          {contas.slice(0, 3).map(c => {
            const movs = allTransForContas.filter(t => t.conta_id === c.id);
            const entradas = movs.filter(t => t.tipo === "Entrada").reduce((s, t) => s + Number(t.valor), 0);
            const saidas = movs.filter(t => t.tipo === "Saída").reduce((s, t) => s + Number(t.valor), 0);
            const saldoConta = Number(c.saldo_inicial) + entradas - saidas;
            return (
              <div key={c.id} className="flex items-center justify-between">
                <span className="text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.cor }} />
                  {c.nome}
                </span>
                <span className={`text-xs font-medium ${saldoConta >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(saldoConta)}</span>
              </div>
            );
          })}
        </div>
      </Link>
    </div>
  );
}
