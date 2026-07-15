import { formatCurrency } from "@/lib/formatters";
import type { FolhaResumo } from "@/lib/folhaMaoObra";

interface FolhaKPIsProps {
  folha: FolhaResumo;
  usarEstimativa: boolean;
  custosEng: number;
  exames: number;
  totalGeralMes: number;
}

export function FolhaKPIs({
  folha,
  usarEstimativa,
  custosEng,
  exames,
  totalGeralMes,
}: FolhaKPIsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <KPI label={usarEstimativa ? "Diárias est." : "Diárias"} value={folha.total_diarias} />
      <KPI label="Encargos" value={folha.total_fgts + folha.total_inss} accent="warning" />
      <KPI label="Adicionais" value={folha.total_extras} accent="info" />
      <KPI label="Custos do mês" value={custosEng + exames} />
      <KPI label="Total Geral" value={totalGeralMes} accent="primary" />
    </div>
  );
}

function KPI({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "primary" | "warning" | "info";
}) {
  const cls =
    accent === "warning"
      ? "stat-card-warning"
      : accent === "info"
      ? "stat-card-info"
      : accent === "primary"
      ? "stat-card-success"
      : "glass-card";
  const color =
    accent === "warning"
      ? "text-warning"
      : accent === "info"
      ? "text-info"
      : accent === "primary"
      ? "text-primary"
      : "";
  return (
    <div className={`${cls} p-4`}>
      <p className="text-xs text-muted-foreground uppercase">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{formatCurrency(value)}</p>
    </div>
  );
}
