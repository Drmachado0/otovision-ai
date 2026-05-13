// Util to flatten pending parcelas of obra_compras into virtual "Contas a Pagar" rows.
// Avoids duplication: only parcelas with status "Pendente" are returned (paying creates
// a real lançamento in obra_transacoes_fluxo via pagar_parcela_atomica).

export interface ParcelaJSON {
  numero?: number;
  valor?: number | string;
  data_vencimento?: string;
  status?: string;
}

export interface CompraComParcelas {
  id: string;
  fornecedor?: string | null;
  descricao?: string | null;
  categoria?: string | null;
  conta_id?: string | null;
  parcelas?: ParcelaJSON[] | null;
  status_entrega?: string | null;
}

export interface ParcelaPendenteRow {
  id: string;                  // virtual id: compra:<compra_id>:<numero>
  origem: "compra-parcela";
  compra_id: string;
  numero_parcela: number;
  tipo: "Saída";
  status: "pendente";
  valor: number;
  data: string;
  data_vencimento: string | null;
  descricao: string;
  categoria: string;
  forma_pagamento: string;
  conta_id: string;
  parcela_numero: number;
  parcela_total: number;
  observacoes: string;
  recorrencia: string;
  recorrencia_grupo_id: string | null;
  created_at: string;
}

export function flattenParcelasPendentes(compras: CompraComParcelas[]): ParcelaPendenteRow[] {
  const out: ParcelaPendenteRow[] = [];
  for (const c of compras) {
    if (!c?.parcelas || !Array.isArray(c.parcelas)) continue;
    if (c.status_entrega === "Cancelado") continue;
    const total = c.parcelas.length;
    for (const p of c.parcelas) {
      const status = String(p?.status ?? "").toLowerCase();
      if (status !== "pendente") continue;
      const numero = Number(p?.numero ?? 0);
      const valor = Number(p?.valor ?? 0);
      if (!Number.isFinite(valor) || valor <= 0) continue;
      const venc = p?.data_vencimento ?? null;
      out.push({
        id: `compra:${c.id}:${numero}`,
        origem: "compra-parcela",
        compra_id: c.id,
        numero_parcela: numero,
        tipo: "Saída",
        status: "pendente",
        valor,
        data: venc ?? "",
        data_vencimento: venc,
        descricao: `${c.descricao || c.fornecedor || "Compra"} (parcela ${numero}/${total})`,
        categoria: c.categoria || "",
        forma_pagamento: "",
        conta_id: c.conta_id || "",
        parcela_numero: numero,
        parcela_total: total,
        observacoes: "",
        recorrencia: "Parcelada",
        recorrencia_grupo_id: null,
        created_at: venc ?? "",
      });
    }
  }
  return out;
}

export function totalParcelasPendentes(compras: CompraComParcelas[]): number {
  return flattenParcelasPendentes(compras).reduce((s, r) => s + r.valor, 0);
}
