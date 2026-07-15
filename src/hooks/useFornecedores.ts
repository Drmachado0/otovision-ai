import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

export interface FornecedorOption {
  id: string;
  nome: string;
  telefone?: string;
  especialidade?: string;
}

export function useFornecedores() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: fornecedores = [], isLoading: loading } = useQuery({
    queryKey: ["fornecedores", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obra_fornecedores")
        .select("id, nome, telefone, especialidade")
        .is("deleted_at", null)
        .order("nome", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data as FornecedorOption[]) ?? [];
    },
  });

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["fornecedores", user?.id] });
  }, [queryClient, user?.id]);

  useRealtimeSubscription("obra_fornecedores", refetch);

  const addFornecedor = useCallback(async (
    nome: string,
    telefone?: string
  ): Promise<FornecedorOption | null> => {
    const trimmed = nome.trim();
    if (!trimmed || !user) return null;
    const { data, error } = await supabase
      .from("obra_fornecedores")
      .insert({ user_id: user.id, nome: trimmed, telefone: telefone || "" } as any)
      .select("id, nome, telefone, especialidade")
      .single();
    if (error || !data) return null;
    await refetch();
    return data as FornecedorOption;
  }, [user, refetch]);

  return { fornecedores, loading, addFornecedor, refetch };
}
