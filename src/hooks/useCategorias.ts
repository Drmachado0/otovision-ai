import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { CATEGORIAS_PADRAO } from "@/lib/formatters";

export function useCategorias() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: categorias = CATEGORIAS_PADRAO, isLoading: loading } = useQuery({
    queryKey: ["categorias", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("obra_categorias")
        .select("nome")
        .is("deleted_at", null)
        .order("nome", { ascending: true });
      if (error) throw error;
      const nomes = (data as { nome: string }[]).map((c) => c.nome);
      // merge defaults + custom (dedup, case-insensitive)
      const all = [...CATEGORIAS_PADRAO, ...nomes];
      const seen = new Set<string>();
      const merged: string[] = [];
      for (const n of all) {
        const k = n.toLowerCase().trim();
        if (k && !seen.has(k)) {
          seen.add(k);
          merged.push(n);
        }
      }
      merged.sort((a, b) => a.localeCompare(b, "pt-BR"));
      return merged;
    },
  });

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["categorias", user?.id] });
  }, [queryClient, user?.id]);

  useRealtimeSubscription("obra_categorias", refetch);

  const addCategoria = useCallback(async (nome: string): Promise<string | null> => {
    const trimmed = nome.trim();
    if (!trimmed || !user) return null;
    // se já existe (case-insensitive) entre as atuais, só retorna
    const exists = categorias.find((c) => c.toLowerCase() === trimmed.toLowerCase());
    if (exists) return exists;
    const { error } = await (supabase as any)
      .from("obra_categorias")
      .insert({ user_id: user.id, nome: trimmed });
    // erro provável = unique constraint; de qualquer forma recarrega e devolve o nome
    await refetch();
    return trimmed;
  }, [user, categorias, refetch]);

  return { categorias, loading, addCategoria, refetch };
}
