import { useState, useRef, useEffect } from "react";
import { LogOut, User, Shield, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import type { AppRole } from "@/hooks/useUserRole";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  financeiro: "Financeiro",
  construtor: "Construtor",
  visualizador: "Visualizador",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-primary/10 text-primary",
  financeiro: "bg-info/10 text-info",
  construtor: "bg-warning/10 text-warning",
  visualizador: "bg-muted text-muted-foreground",
};

interface UserMenuProps {
  email?: string | null;
  role: AppRole | null;
  onLogout: () => Promise<void>;
}

export default function UserMenu({ email, role, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    await onLogout();
    toast.success("Sessão encerrada");
  };

  const initial = email?.charAt(0).toUpperCase() || "U";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
          {initial}
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 glass-card p-2 z-50 animate-slide-in">
          <div className="px-3 py-2 border-b border-border/50 mb-1">
            <p className="text-sm font-medium truncate">{email}</p>
            {role && (
              <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${ROLE_COLORS[role] || ""}`}>
                <Shield className="w-3 h-3" />
                {ROLE_LABELS[role] || role}
              </span>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
