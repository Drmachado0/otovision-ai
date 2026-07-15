import { AlertTriangle } from "lucide-react";

interface DashboardAlertsProps {
  alerts: string[];
}

export function DashboardAlerts({ alerts }: DashboardAlertsProps) {
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-2">
      {alerts.map((a, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {a}
        </div>
      ))}
    </div>
  );
}
