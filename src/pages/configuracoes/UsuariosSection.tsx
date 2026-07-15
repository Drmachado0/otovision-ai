import { Users, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ROLES, type UserWithRole } from "./types";

interface UsuariosSectionProps {
  users: UserWithRole[];
  loadingUsers: boolean;
  currentUserId?: string;
  updateRole: (userId: string, newRole: string) => void;
}

export function UsuariosSection({ users, loadingUsers, currentUserId, updateRole }: UsuariosSectionProps) {
  return (
    <section className="glass-card p-6 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" /> Usuários e Permissões
      </h2>
      {loadingUsers ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum usuário com role atribuída</p>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors">
              <div>
                <p className="text-sm truncate max-w-[280px]">{u.email !== u.id ? u.email : u.id.substring(0, 8) + "..."}</p>
                {u.id === currentUserId && <Badge variant="outline" className="text-[10px] ml-2">Você</Badge>}
              </div>
              <select
                value={u.role}
                onChange={e => updateRole(u.id, e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-background border border-border text-sm"
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
