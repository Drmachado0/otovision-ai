import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { CATEGORIAS_PADRAO } from "@/lib/formatters";

export function useCategorias() {
  const { user } = useAuth();
  const [categorias, setCategorias] = useState<string[]>(CATEGORIAS_PADRAO);
  const [loading, setLoading] = useState(true);

  const fetchCategorias = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("obra_categorias")
      .select("nome")
      .is("deleted_at", null)
      .order("nome", { ascending: true });
    if (!error && data) {
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
      setCategorias(merged);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCategorias(); }, [fetchCategorias]);
  useRealtimeSubscription("obra_categorias", fetchCategorias);

  const addCategoria = useCallback(async (nome: string): Promise<string | null> => {
    const trimmed = nome.trim();
    if (!trimmed || !user) return null;
    // se já existe (case-insensitive) entre as atuais, só retorna
    const exists = categorias.find((c) => c.toLowerCase() === trimmed.toLowerCase());
    if (exists) return exists;
    const { error } = await (supabase as any)
      .from("obra_categorias")
      .insert({ user_id: user.id, nome: trimmed });
    if (error) {
      // pode ser unique constraint — recarrega e tenta achar
      await fetchCategorias();
      return trimmed;
    }
    await fetchCategorias();
    return trimmed;
  }, [user, categorias, fetchCategorias]);

  return { categorias, loading, addCategoria, refetch: fetchCategorias };
}
