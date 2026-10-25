import {
  Gauge, ArrowRightLeft, ShoppingBag, ScanText,
  BadgePercent, ShieldCheck, Activity, SlidersHorizontal, LogOut, Building2
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Dashboard", url: "/", icon: Gauge },
  { title: "Fluxo de Caixa", url: "/fluxo-caixa", icon: ArrowRightLeft },
  { title: "Compras", url: "/compras", icon: ShoppingBag },
  { title: "Documentos IA", url: "/documentos", icon: ScanText },
  { title: "Comissões", url: "/comissoes", icon: BadgePercent },
  { title: "Auditoria", url: "/auditoria", icon: ShieldCheck },
  { title: "Meu Raio-X Financeiro", url: "/relatorios", icon: Activity },
  { title: "Configurações", url: "/configuracoes", icon: SlidersHorizontal },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const _location = useLocation();
  const { user } = useAuth();
  const signOut = () => supabase.auth.signOut();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="font-bold text-sm tracking-wide text-sidebar-accent-foreground">OTOVISION</h2>
              <p className="text-[10px] text-muted-foreground">Gestão de Obra</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-6 w-6 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && user && (
          <p className="text-xs text-muted-foreground truncate mb-2 px-2">{user.email}</p>
        )}
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-destructive" onClick={signOut}>
          <LogOut className="h-6 w-6 mr-2 shrink-0" />
          {!collapsed && "Sair"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
