// Helper to build payloads for obra_transacoes_fluxo inserts
// Centralizes Única / Parcelada / Recorrente logic so multiple screens share the same shape.

export type RecorrenciaTipo = "Única" | "Parcelada" | "Recorrente";

export interface BuildLancamentoInput {
  user_id: string;
  tipo: "Entrada" | "Saída";
  valor: number;
  data: string; // YYYY-MM-DD
  data_vencimento: string; // YYYY-MM-DD
  categoria: string;
  descricao: string;
  forma_pagamento: string;
  observacoes?: string;
  conta_id?: string | null;
  recorrencia_tipo: RecorrenciaTipo;
  numero_parcelas?: number;
  periodicidade?: string; // Mensal | Semanal | etc
  origem_tipo?: string;
}

export function buildLancamentos(input: BuildLancamentoInput): Record<string, unknown>[] {
  const isSaida = input.tipo === "Saída";
  const statusBase = isSaida ? "pendente" : "pago";
  const grupoId = input.recorrencia_tipo !== "Única" ? crypto.randomUUID() : null;
  const obs = input.observacoes ?? "";
  const conta = input.conta_id || null;

  if (input.recorrencia_tipo === "Parcelada" && isSaida) {
    const n = Math.max(1, Number(input.numero_parcelas) || 1);
    const valorParcela = Math.round((input.valor / n) * 100) / 100;
    const rows: Record<string, unknown>[] = [];
    for (let i = 0; i < n; i++) {
      const venc = new Date(input.data_vencimento);
      venc.setMonth(venc.getMonth() + i);
      rows.push({
        user_id: input.user_id,
        tipo: input.tipo,
        valor: i === n - 1 ? input.valor - valorParcela * (n - 1) : valorParcela,
        data: input.data,
        data_vencimento: venc.toISOString().split("T")[0],
        categoria: input.categoria,
        descricao: input.descricao,
        forma_pagamento: input.forma_pagamento,
        observacoes: obs,
        recorrencia: "Parcelada",
        recorrencia_grupo_id: grupoId,
        parcela_numero: i + 1,
        parcela_total: n,
        referencia: "",
        conta_id: conta,
        status: "pendente",
        origem_tipo: input.origem_tipo ?? null,
      });
    }
    return rows;
  }

  if (input.recorrencia_tipo === "Recorrente" && isSaida) {
    return [
      {
        user_id: input.user_id,
        tipo: input.tipo,
        valor: input.valor,
        data: input.data,
        data_vencimento: input.data_vencimento,
        categoria: input.categoria,
        descricao: input.descricao,
        forma_pagamento: input.forma_pagamento,
        observacoes: obs,
        recorrencia: input.periodicidade || "Mensal",
        recorrencia_ativa: true,
        recorrencia_mae: true,
        recorrencia_grupo_id: grupoId,
        recorrencia_frequencia: input.periodicidade || "Mensal",
        recorrencia_ocorrencias_criadas: 1,
        referencia: "",
        conta_id: conta,
        status: "pendente",
        origem_tipo: input.origem_tipo ?? null,
      },
    ];
  }

  // Única
  const isEntrada = input.tipo === "Entrada";
  return [
    {
      user_id: input.user_id,
      tipo: input.tipo,
      valor: input.valor,
      data: input.data,
      data_vencimento: isSaida ? input.data_vencimento : null,
      categoria: input.categoria,
      descricao: input.descricao,
      forma_pagamento: input.forma_pagamento,
      observacoes: obs,
      recorrencia: "Única",
      referencia: "",
      conta_id: conta,
      status: statusBase,
      data_pagamento: isEntrada ? new Date().toISOString() : null,
      origem_tipo: input.origem_tipo ?? null,
    },
  ];
}
