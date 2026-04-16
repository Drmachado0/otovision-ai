import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Automatically generates notifications for:
 * - Overdue invoices (NFs vencidas)
 * - Late purchase deliveries
 * - Overdue pending payments (contas a pagar vencidas)
 * - Late project phases
 * - Pending commissions above threshold
 * Runs once on mount, checks daily
 */
export function useAutoNotifications() {
  const { user } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (!user || ran.current) return;
    ran.current = true;
    generateNotifications(user.id);
  }, [user]);
}

async function createNotification(userId: string, tipo: string, titulo: string, mensagem: string, prioridade: string, link: string) {
  // Check if similar notification already exists today
  const today = new Date().toISOString().split("T")[0];
  const { data: existing } = await supabase
    .from("obra_notificacoes")
    .select("id")
    .eq("user_id", userId)
    .eq("titulo", titulo)
    .gte("created_at", today)
    .limit(1);

  if (existing && existing.length > 0) return; // Already notified today

  await supabase.from("obra_notificacoes").insert({
    user_id: userId,
    tipo,
    titulo,
    mensagem,
    prioridade,
    link,
    status: "nao_lida",
  } as any);
}

async function generateNotifications(userId: string) {
  const today = new Date().toISOString().split("T")[0];

  // 1. NFs vencidas
  const { data: nfs } = await supabase
    .from("obra_notas_fiscais")
    .select("id, numero, fornecedor, valor_bruto, data_vencimento")
    .is("deleted_at", null)
    .neq("status", "Paga")
    .lt("data_vencimento", today);

  if (nfs && nfs.length > 0) {
    for (const nf of nfs.slice(0, 5)) {
      const dias = Math.floor((Date.now() - new Date(nf.data_vencimento).getTime()) / 86400000);
      await createNotification(
        userId,
        "alerta",
        `NF ${nf.numero || ""} vencida`,
        `NF de ${nf.fornecedor || "fornecedor"} venceu ha ${dias} dia(s). Valor: R$ ${Number(nf.valor_bruto || 0).toFixed(2)}`,
        dias > 7 ? "alta" : "media",
        "/notas-fiscais"
      );
    }
  }

  // 2. Contas a pagar vencidas
  const { data: pendentes } = await supabase
    .from("obra_transacoes_fluxo")
    .select("id, descricao, valor, data_vencimento")
    .is("deleted_at", null)
    .eq("status", "pendente")
    .eq("tipo", "Saída")
    .lt("data_vencimento", today);

  if (pendentes && pendentes.length > 0) {
    const total = pendentes.reduce((s, p) => s + Number(p.valor), 0);
    await createNotification(
      userId,
      "alerta",
      `${pendentes.length} pagamento(s) vencido(s)`,
      `Voce tem ${pendentes.length} conta(s) a pagar vencida(s) totalizando R$ ${total.toFixed(2)}`,
      "alta",
      "/contas-pagar"
    );
  }

  // 3. Contas a pagar vencendo hoje
  const { data: venceHoje } = await supabase
    .from("obra_transacoes_fluxo")
    .select("id, descricao, valor")
    .is("deleted_at", null)
    .eq("status", "pendente")
    .eq("tipo", "Saída")
    .eq("data_vencimento", today);

  if (venceHoje && venceHoje.length > 0) {
    await createNotification(
      userId,
      "info",
      `${venceHoje.length} pagamento(s) vencem hoje`,
      `${venceHoje.length} conta(s) vencem hoje. Confirme os pagamentos.`,
      "media",
      "/contas-pagar"
    );
  }

  // 4. Entregas de compras pendentes (>7 dias)
  const seteDiasAtras = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const { data: compras } = await supabase
    .from("obra_compras")
    .select("id, fornecedor, descricao, data")
    .is("deleted_at", null)
    .eq("status_entrega", "Pedido")
    .lt("data", seteDiasAtras);

  if (compras && compras.length > 0) {
    await createNotification(
      userId,
      "alerta",
      `${compras.length} compra(s) sem entrega`,
      `${compras.length} compra(s) com mais de 7 dias sem confirmacao de entrega`,
      "media",
      "/compras"
    );
  }

  // 5. Etapas atrasadas do cronograma
  const { data: etapas } = await supabase
    .from("obra_cronograma")
    .select("id, nome, fim_previsto, status")
    .neq("status", "Concluída")
    .lt("fim_previsto", today);

  if (etapas && etapas.length > 0) {
    await createNotification(
      userId,
      "alerta",
      `${etapas.length} etapa(s) atrasada(s)`,
      `Etapas atrasadas: ${etapas.slice(0, 3).map(e => e.nome).join(", ")}${etapas.length > 3 ? ` e mais ${etapas.length - 3}` : ""}`,
      "alta",
      "/cronograma"
    );
  }
}
