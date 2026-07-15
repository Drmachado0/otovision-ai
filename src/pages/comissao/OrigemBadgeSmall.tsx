import { memo } from "react";
import { parseObservacoes } from "@/components/ComissaoDetailDrawer";

export const OrigemBadgeSmall = memo(function OrigemBadgeSmall({ obs }: { obs: string }) {
  const { tipo } = parseObservacoes(obs);
  const cls: Record<string, string> = {
    NF: "badge-info",
    Orçamento: "badge-warning",
    Compra: "badge-primary",
    Manual: "badge-muted",
  };
  return <span className={`${cls[tipo] || cls.Manual} text-[10px]`}>{tipo}</span>;
});
