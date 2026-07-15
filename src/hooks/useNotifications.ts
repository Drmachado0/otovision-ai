import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

export interface Notification {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  status: string;
  prioridade: string;
  link: string;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obra_notificacoes")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as Notification[]) ?? [];
    },
  });

  const unreadCount = notifications.filter((n) => n.status === "nao_lida").length;

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
  }, [queryClient, user?.id]);

  useRealtimeSubscription("obra_notificacoes", refresh);

  const markAsRead = async (id: string) => {
    await supabase
      .from("obra_notificacoes")
      .update({ status: "lida", read_at: new Date().toISOString() } as any)
      .eq("id", id);
    refresh();
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from("obra_notificacoes")
      .update({ status: "lida", read_at: new Date().toISOString() } as any)
      .eq("user_id", user.id)
      .eq("status", "nao_lida");
    refresh();
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead, refresh };
}
