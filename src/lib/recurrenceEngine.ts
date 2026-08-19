import { supabase } from "@/integrations/supabase/client";
import { addIntervalClamped, parseLocalDate } from "./dateUtils";

interface RecurringTransaction {
  id: string;
  user_id: string;
  tipo: string;
  valor: number;
  data: string;
  data_vencimento: string | null;
  categoria: string;
  descricao: string;
  forma_pagamento: string;
  observacoes: string;
  recorrencia: string;
  recorrencia_ativa: boolean;
  recorrencia_grupo_id: string | null;
  recorrencia_frequencia: string | null;
  recorrencia_max_ocorrencias: number | null;
  recorrencia_ocorrencias_criadas: number;
  recorrencia_fim: string | null;
}

/**
 * Processes recurring transactions and creates pending entries for upcoming periods.
 * Should be called on ContasAPagarPage mount.
 * Returns the number of new entries created.
 *
 * PROTEÇÕES CONTRA DUPLICATA (v2 - 2026-08-18):
 * 1. Verifica se já existe ocorrência ativa para o mesmo grupo+vencimento
 * 2. Índice único no banco (idx_obra_transacoes_recorrencia_unica) como segunda barreira
 * 3. Trata erro 23505 (unique violation) como "já existe, pular"
 * 4. Só considera ocorrências não-canceladas para calcular próxima data
 */
export async function processRecurrences(): Promise<number> {
  const { data: mothers } = await supabase
    .from("obra_transacoes_fluxo")
    .select("id, user_id, tipo, valor, data, data_vencimento, categoria, descricao, forma_pagamento, observacoes, recorrencia, recorrencia_ativa, recorrencia_grupo_id, recorrencia_frequencia, recorrencia_max_ocorrencias, recorrencia_ocorrencias_criadas, recorrencia_fim" as any)
    .is("deleted_at", null)
    .eq("recorrencia_mae" as any, true)
    .eq("recorrencia_ativa" as any, true);

  if (!mothers || mothers.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let created = 0;

  for (const mom of (mothers as unknown as RecurringTransaction[])) {
    const freq = mom.recorrencia_frequencia || mom.recorrencia || "Mensal";
    const grupoId = mom.recorrencia_grupo_id;

    if (!grupoId) continue;

    // Check limits
    if (mom.recorrencia_max_ocorrencias && mom.recorrencia_ocorrencias_criadas >= mom.recorrencia_max_ocorrencias) {
      continue;
    }
    if (mom.recorrencia_fim && parseLocalDate(mom.recorrencia_fim) < today) {
      // Deactivate expired recurrence
      await supabase.from("obra_transacoes_fluxo").update({ recorrencia_ativa: false }).eq("id", mom.id);
      continue;
    }

    // Find the latest NON-CANCELLED occurrence in this group
    // (inclui pendente e pago; canceladas não contam para calcular próxima)
    const { data: latest } = await supabase
      .from("obra_transacoes_fluxo")
      .select("data_vencimento" as any)
      .eq("recorrencia_grupo_id" as any, grupoId)
      .is("deleted_at", null)
      .neq("status" as any, "cancelado")
      .order("data_vencimento" as any, { ascending: false })
      .limit(1)
      .maybeSingle();

    const latestRow = latest as unknown as { data_vencimento?: string | null } | null;
    const lastVencimentoISO = latestRow?.data_vencimento
      ?? mom.data_vencimento
      ?? mom.data;

    // Calculate next due date (clamp de fim de mês, sem drift de timezone)
    const nextVencimentoISO = addIntervalClamped(lastVencimentoISO, freq);
    const nextVencimento = parseLocalDate(nextVencimentoISO);

    // Only create if next occurrence is within 30 days from now
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    if (nextVencimento > thirtyDaysFromNow) continue;

    // PROTEÇÃO 1: verificar se já existe ocorrência ativa para este vencimento
    const { data: existing } = await supabase
      .from("obra_transacoes_fluxo")
      .select("id" as any)
      .eq("recorrencia_grupo_id" as any, grupoId)
      .eq("data_vencimento" as any, nextVencimentoISO)
      .is("deleted_at", null)
      .neq("status" as any, "cancelado")
      .limit(1)
      .maybeSingle();

    if (existing) {
      // Já existe ocorrência ativa para este vencimento — não criar duplicata
      continue;
    }

    // PROTEÇÃO 2: inserir com tratamento de unique violation (race condition)
    const { error } = await supabase.from("obra_transacoes_fluxo").insert({
      user_id: mom.user_id,
      tipo: mom.tipo,
      valor: mom.valor,
      data: mom.data,
      data_vencimento: nextVencimentoISO,
      categoria: mom.categoria,
      descricao: mom.descricao,
      forma_pagamento: mom.forma_pagamento,
      observacoes: mom.observacoes,
      recorrencia: freq,
      recorrencia_grupo_id: grupoId,
      recorrencia_mae: false,
      recorrencia_ativa: false,
      referencia: "",
      status: "pendente",
    } as any);

    if (error) {
      // 23505 = unique_violation (índice idx_obra_transacoes_recorrencia_unica)
      // Significa que outra aba/dispositivo já criou — não é erro real
      if (error.code === "23505") {
        console.debug(`[recurrence] Ocorrência já existe para ${grupoId} em ${nextVencimentoISO} (race condition evitada)`);
        continue;
      }
      console.error(`[recurrence] Erro ao criar ocorrência:`, error);
      continue;
    }

    created++;

    // Update mother occurrence count
    await supabase
      .from("obra_transacoes_fluxo")
      .update({ recorrencia_ocorrencias_criadas: mom.recorrencia_ocorrencias_criadas + 1 })
      .eq("id", mom.id);
  }

  return created;
}
