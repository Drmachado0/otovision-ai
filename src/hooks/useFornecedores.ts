import { useCallback, useEffect, useState } from "react";
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
  const [fornecedores, setFornecedores] = useState<FornecedorOption[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFornecedores = useCallback(async () => {
    const { data, error } = await supabase
      .from("obra_fornecedores")
      .select("id, nome, telefone, especialidade")
      .is("deleted_at", null)
      .order("nome", { ascending: true })
      .limit(500);
    if (!error && data) {
      setFornecedores(data as FornecedorOption[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchFornecedores(); }, [fetchFornecedores]);
  useRealtimeSubscription("obra_fornecedores", fetchFornecedores);

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
    await fetchFornecedores();
    return data as FornecedorOption;
  }, [user, fetchFornecedores]);

  return { fornecedores, loading, addFornecedor, refetch: fetchFornecedores };
}
