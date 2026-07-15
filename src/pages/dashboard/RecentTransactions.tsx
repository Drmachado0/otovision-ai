import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowDownRight, ArrowRight, CreditCard } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import OrigemBadge from "@/components/OrigemBadge";
import { type TransacaoFull } from "@/components/TransacaoDetailDrawer";
import type { TransacaoRow } from "./types";

interface RecentTransactionsProps {
  transacoes: TransacaoRow[];
  onSelect: (t: TransacaoFull) => void;
}

export function RecentTransactions({ transacoes, onSelect }: RecentTransactionsProps) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">Últimas Transações</h2>
        <Link to="/fluxo">
          <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-primary">
            Ver todos <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>
      {transacoes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma transação registrada</p>
      ) : (
        <div className="space-y-1">
          {transacoes.map((t, i) => (
            <div
              key={t.id}
              onClick={() => onSelect(t as TransacaoFull)}
              className="flex items-center justify-between py-2.5 px-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-accent/50 animate-fade-in-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.tipo === "Entrada" ? "bg-success/10" : "bg-destructive/10"}`}>
                  {t.tipo === "Entrada" ? <ArrowUpRight className="w-4 h-4 text-success" /> : <ArrowDownRight className="w-4 h-4 text-destructive" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{t.descricao || t.categoria || "Sem descrição"}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground">{t.categoria}</p>
                    {t.forma_pagamento && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <CreditCard className="w-2.5 h-2.5" />{t.forma_pagamento}
                      </span>
                    )}
                    <OrigemBadge origem={t.origem_tipo} compact />
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-sm font-semibold ${t.tipo === "Entrada" ? "text-success" : "text-destructive"}`}>
                  {t.tipo === "Entrada" ? "+" : "-"}{formatCurrency(Number(t.valor))}
                </span>
                <p className="text-[10px] text-muted-foreground">{formatDate(t.data)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
