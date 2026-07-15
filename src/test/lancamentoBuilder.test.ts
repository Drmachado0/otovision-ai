import { describe, expect, it } from "vitest";
import { buildLancamentos, type BuildLancamentoInput } from "@/lib/lancamentoBuilder";

const base: BuildLancamentoInput = {
  user_id: "u1",
  tipo: "Saída",
  valor: 300,
  data: "2026-01-31",
  data_vencimento: "2026-01-31",
  categoria: "Material",
  descricao: "Cimento",
  forma_pagamento: "Boleto",
  recorrencia_tipo: "Parcelada",
  numero_parcelas: 3,
};

describe("buildLancamentos - Parcelada", () => {
  it("gera vencimentos com clamp de fim de mês (sem pular fevereiro)", () => {
    const rows = buildLancamentos(base);
    expect(rows.map((r) => r.data_vencimento)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
    ]);
  });

  it("mantém a soma exata das parcelas em centavos", () => {
    const rows = buildLancamentos({ ...base, valor: 100 });
    expect(rows.map((r) => r.valor)).toEqual([33.33, 33.33, 33.34]);
    const soma = rows.reduce((t, r) => Math.round((t + (r.valor as number)) * 100) / 100, 0);
    expect(soma).toBe(100);
  });

  it("todas as parcelas compartilham o mesmo grupo", () => {
    const rows = buildLancamentos(base);
    const grupos = new Set(rows.map((r) => r.recorrencia_grupo_id));
    expect(grupos.size).toBe(1);
    expect(rows[0].recorrencia_grupo_id).not.toBeNull();
  });
});

describe("buildLancamentos - Única", () => {
  it("entrada não tem data_vencimento e já sai paga", () => {
    const rows = buildLancamentos({
      ...base,
      tipo: "Entrada",
      recorrencia_tipo: "Única",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].data_vencimento).toBeNull();
    expect(rows[0].status).toBe("pago");
  });
});
