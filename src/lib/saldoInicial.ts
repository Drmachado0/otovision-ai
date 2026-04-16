import { supabase } from "@/integrations/supabase/client";

/**
 * Soma o saldo_inicial de todas as contas financeiras ativas (não deletadas).
 * Esse valor representa a base de caixa do projeto e deve ser somado às
 * entradas registradas em obra_transacoes_fluxo para refletir o caixa real.
 */
export async function fetchSaldoInicialTotal(): Promise<number> {
  const { data, error } = await supabase
    .from("obra_contas_financeiras")
    .select("saldo_inicial, ativa")
    .eq("ativa", true);
  if (error || !data) return 0;
  return data.reduce((sum, c: { saldo_inicial: number | string }) => sum + Number(c.saldo_inicial || 0), 0);
}
