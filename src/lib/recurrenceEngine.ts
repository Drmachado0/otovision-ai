import { supabase } from "@/integrations/supabase/client";

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

function addInterval(date: Date, freq: string): Date {
  const next = new Date(date);
  switch (freq) {
    case "Mensal":
      next.setMonth(next.getMonth() + 1);
      break;
    case "Trimestral":
      next.setMonth(next.getMonth() + 3);
      break;
    case "Anual":
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }
  return next;
}

/**
 * Processes recurring transactions and creates pending entries for upcoming periods.
 * Should be called on ContasAPagarPage mount.
 * Returns the number of new entries created.
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

    // Check limits
    if (mom.recorrencia_max_ocorrencias && mom.recorrencia_ocorrencias_criadas >= mom.recorrencia_max_ocorrencias) {
      continue;
    }
    if (mom.recorrencia_fim && new Date(mom.recorrencia_fim) < today) {
      // Deactivate expired recurrence
      await supabase.from("obra_transacoes_fluxo").update({ recorrencia_ativa: false }).eq("id", mom.id);
      continue;
    }

    // Find the latest occurrence in this group
    const { data: latest } = await supabase
      .from("obra_transacoes_fluxo")
      .select("data_vencimento" as any)
      .eq("recorrencia_grupo_id" as any, grupoId!)
      .is("deleted_at", null)
      .order("data_vencimento" as any, { ascending: false })
      .limit(1)
      .maybeSingle();

    const latestRow = latest as unknown as { data_vencimento?: string | null } | null;
    const lastVencimento = latestRow?.data_vencimento
      ? new Date(latestRow.data_vencimento)
      : (mom.data_vencimento ? new Date(mom.data_vencimento) : new Date(mom.data));

    // Calculate next due date
    const nextVencimento = addInterval(lastVencimento, freq);

    // Only create if next occurrence is within 30 days from now
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    if (nextVencimento <= thirtyDaysFromNow) {
      const { error } = await supabase.from("obra_transacoes_fluxo").insert({
        user_id: mom.user_id,
        tipo: mom.tipo,
        valor: mom.valor,
        data: mom.data,
        data_vencimento: nextVencimento.toISOString().split("T")[0],
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

      if (!error) {
        created++;
        // Update mother occurrence count
        await supabase
          .from("obra_transacoes_fluxo")
          .update({ recorrencia_ocorrencias_criadas: mom.recorrencia_ocorrencias_criadas + 1 })
          .eq("id", mom.id);
      }
    }
  }

  return created;
}
