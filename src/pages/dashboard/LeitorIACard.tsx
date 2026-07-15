import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

export function LeitorIACard() {
  return (
    <Link
      to="/leitor-ia"
      className="glass-card p-4 flex items-center justify-between border border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all animate-fade-in-up"
      style={{ animationDelay: "50ms" }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">Leitor IA</p>
          <p className="text-xs text-muted-foreground">Envie nota fiscal, recibo ou extrato — extração automática</p>
        </div>
      </div>
      <ArrowRight className="w-5 h-5 text-muted-foreground" />
    </Link>
  );
}
