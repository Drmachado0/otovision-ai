import { supabase } from "@/integrations/supabase/client";
import {
  FolhaItem, FolhaEncargo,
  calcularTotaisFolha, calcularTotaisItem, normalizarCpf,
} from "@/lib/folhaPagamento";

export async function upsertTrabalhadores(userId: string, itens: FolhaItem[]) {
  for (const it of itens) {
    if (!it.nome?.trim()) continue;
    const cpfNorm = normalizarCpf(it.cpf);
    let existing: any = null;
    if (cpfNorm) {
      const { data } = await (supabase as any)
        .from("obra_mao_de_obra")
        .select("id")
        .eq("user_id", userId)
        .eq("cpf_normalizado", cpfNorm)
        .is("deleted_at", null)
        .maybeSingle();
      existing = data;
    }
    if (!existing) {
      const { data } = await (supabase as any)
        .from("obra_mao_de_obra")
        .select("id")
        .eq("user_id", userId)
        .ilike("nome", it.nome.trim())
        .is("deleted_at", null)
        .maybeSingle();
      existing = data;
    }
    const payload: any = {
      nome: it.nome.trim(),
      funcao: it.funcao || "",
      valor_diaria: it.valor_diaria || 0,
      cpf: it.cpf || "",
      cpf_normalizado: cpfNorm || null,
    };
    if (existing) {
      await (supabase as any).from("obra_mao_de_obra").update(payload).eq("id", existing.id);
    } else {
      await (supabase as any).from("obra_mao_de_obra").insert({
        ...payload, user_id: userId, ativo: true, tipo_contrato: "Diária",
        aliquota_fgts: 8, aliquota_inss: 20, incide_encargos: false,
      });
    }
  }
}

export async function recalcularFolhaDB(folhaId: string): Promise<void> {
  const [{ data: is }, { data: es }] = await Promise.all([
    (supabase as any).from("obra_folha_pagamento_itens").select("*").eq("folha_id", folhaId).is("deleted_at", null),
    (supabase as any).from("obra_folha_pagamento_encargos").select("*").eq("folha_id", folhaId).is("deleted_at", null),
  ]);
  const itens: FolhaItem[] = (is ?? []).map((i: any) => calcularTotaisItem(i));
  const encargos: FolhaEncargo[] = es ?? [];

  // atualizar totais por item
  for (const it of itens) {
    if ((it as any).id) {
      await (supabase as any).from("obra_folha_pagamento_itens").update({
        total_diarias: it.total_diarias,
        total_geral: it.total_geral,
      }).eq("id", (it as any).id);
    }
  }

  const t = calcularTotaisFolha(itens, encargos);
  const { data: f } = await (supabase as any)
    .from("obra_folhas_pagamento").select("diferenca_conferencia").eq("id", folhaId).maybeSingle();
  const diff = f ? Number(f.diferenca_conferencia ?? 0) : 0;
  await (supabase as any).from("obra_folhas_pagamento").update({ ...t }).eq("id", folhaId);
  // mantém o "total_informado" implícito quando havia diferença? Mantém diff inalterado.
  void diff;
}
