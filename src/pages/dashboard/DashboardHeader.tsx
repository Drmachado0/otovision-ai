import { formatDate, todayLocalISO, parseLocalDate } from "@/lib/formatters";
import type { ConfigRow } from "./types";

interface DashboardHeaderProps {
  config: ConfigRow;
}

export function DashboardHeader({ config }: DashboardHeaderProps) {
  return (
    <div className="page-header">
      <h1 className="text-2xl font-bold">{config.nome_obra || "Dashboard Executivo"}</h1>
      <p className="text-sm text-muted-foreground">
        {config.data_inicio && config.data_termino
          ? `${formatDate(config.data_inicio)} → ${formatDate(config.data_termino)}`
          : "Visão macro da obra"}
        {config.area_construida > 0 && ` · ${config.area_construida} m²`}
        {(() => {
          if (!config.data_termino) return null;
          const fim = parseLocalDate(config.data_termino);
          const hoje = parseLocalDate(todayLocalISO());
          const dias = Math.round((fim.getTime() - hoje.getTime()) / 86400000);
          if (isNaN(dias)) return null;
          if (dias < 0) return <span className="text-destructive"> · {Math.abs(dias)} dias em atraso</span>;
          if (dias === 0) return <span className="text-warning"> · termina hoje</span>;
          return <span> · {dias} {dias === 1 ? "dia restante" : "dias restantes"}</span>;
        })()}
      </p>
    </div>
  );
}
