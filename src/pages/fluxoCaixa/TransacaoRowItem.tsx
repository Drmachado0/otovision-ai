import { memo } from "react";
import { ArrowUpRight, ArrowDownRight, CreditCard } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import OrigemBadge from "@/components/OrigemBadge";
import { type TransacaoFull } from "@/components/TransacaoDetailDrawer";

export const TransacaoRowItem = memo(function TransacaoRowItem({
  transacao: t,
  onOpenDetail,
}: {
  transacao: TransacaoFull;
  onOpenDetail: (t: TransacaoFull) => void;
}) {
  return (
    <tr onClick={() => onOpenDetail(t)} className="table-row-interactive">
      <td className="px-4 py-3">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
          t.tipo === "Entrada" ? "bg-success/10" : "bg-destructive/10"
        }`}>
          {t.tipo === "Entrada" ? (
            <ArrowUpRight className="w-3.5 h-3.5 text-success" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5 text-destructive" />
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{formatDate(t.data)}</td>
      <td className="px-4 py-3 font-medium max-w-[200px] truncate" title={t.descricao || ""}>{t.descricao || "-"}</td>
      <td className="px-4 py-3">
        <span className="badge-muted">{t.categoria || "-"}</span>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <CreditCard className="w-3 h-3" />{t.forma_pagamento || "-"}
        </span>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <OrigemBadge origem={t.origem_tipo} compact />
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        {t.status === "pago" && <span className="badge-success text-[10px]">Pago</span>}
        {t.status === "pendente" && <span className="badge-warning text-[10px]">Pendente</span>}
        {t.status === "cancelado" && <span className="badge-muted text-[10px]">Cancelado</span>}
        {!t.status && <span className="badge-success text-[10px]">Pago</span>}
      </td>
      <td className={`px-4 py-3 text-right font-semibold ${
        t.tipo === "Entrada" ? "text-success" : "text-destructive"
      }`}>
        {t.tipo === "Entrada" ? "+" : "-"}{formatCurrency(Number(t.valor))}
      </td>
    </tr>
  );
});
