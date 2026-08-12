import { describe, expect, it } from "vitest";
import {
  buildAssistantPurchase,
  buildAssistantTransaction,
  normalizeIdempotencyKey,
  validateAssistantLaunch,
} from "../../supabase/functions/_shared/assistant-policy";

const base = {
  tipo_documento: "boleto" as const,
  descricao: "Compra de cimento",
  fornecedor: "Materiais Silva",
  valor: 1250.5,
  data_documento: "2026-08-10",
  data_vencimento: "2026-08-20",
  categoria: "Materiais",
  forma_pagamento: "Boleto",
  conta_id: "11111111-1111-4111-8111-111111111111",
  documento_hash: "a".repeat(64),
  idempotency_key: "telegram:123:456",
  confianca: 95,
  ambiguo: false,
};

describe("política de lançamentos do assistente", () => {
  it("aceita boleto completo como saída pendente sem limite de valor", () => {
    expect(validateAssistantLaunch({ ...base, valor: 9_999_999.99 })).toEqual([]);
    const row = buildAssistantTransaction("user-1", base);
    expect(row.status).toBe("pendente");
    expect(row.data).toBe("2026-08-20");
    expect(row.data_vencimento).toBe("2026-08-20");
    expect(row.data_pagamento).toBeNull();
    expect(row.tipo).toBe("Saída");
    expect(row.origem_tipo).toBe("assistente_documento");
  });

  it("só marca recibo como pago quando há prova de quitação", () => {
    const semProva = buildAssistantTransaction("user-1", {
      ...base,
      tipo_documento: "recibo",
      quitado: false,
    });
    const comProva = buildAssistantTransaction("user-1", {
      ...base,
      tipo_documento: "recibo",
      quitado: true,
      data_pagamento: "2026-08-10",
    });
    expect(semProva.status).toBe("pendente");
    expect(comProva.status).toBe("pago");
    expect(comProva.data_pagamento).toBe("2026-08-10");
  });

  it("mantém boleto pendente sem prova e aceita quitação comprovada", () => {
    expect(buildAssistantTransaction("user-1", base).status).toBe("pendente");
    expect(buildAssistantTransaction("user-1", { ...base, quitado: true }).status).toBe("pago");
  });

  it("rejeita documento ambíguo, sem hash, valor ou campos essenciais", () => {
    const errors = validateAssistantLaunch({
      ...base,
      valor: 0,
      descricao: "",
      categoria: "",
      documento_hash: "",
      confianca: 60,
      ambiguo: true,
    });
    expect(errors).toEqual(expect.arrayContaining([
      "valor deve ser maior que zero",
      "descricao é obrigatória",
      "categoria é obrigatória",
      "documento_hash SHA-256 é obrigatório",
      "confiança mínima para gravação automática é 80",
      "documento ambíguo exige revisão",
    ]));
  });

  it("falha fechado quando confiança está ausente, inválida ou fora da faixa", () => {
    const { confianca: _confidence, ...withoutConfidence } = base;
    expect(validateAssistantLaunch(withoutConfidence)).toContain("confianca deve ser um número entre 0 e 100");
    expect(validateAssistantLaunch({ ...base, confianca: Number.NaN })).toContain("confianca deve ser um número entre 0 e 100");
    expect(validateAssistantLaunch({ ...base, confianca: 101 })).toContain("confianca deve ser um número entre 0 e 100");
  });

  it("valida data de pagamento e cada vencimento parcelado", () => {
    expect(validateAssistantLaunch({ ...base, quitado: true, data_pagamento: "2026-02-30" }))
      .toContain("data_pagamento deve estar em YYYY-MM-DD quando quitado");
    expect(validateAssistantLaunch({
      ...base,
      tipo_documento: "nota_fiscal",
      numero_parcelas: 2,
      vencimentos: ["2026-09-10", "data-inválida"],
    })).toContain("todos os vencimentos devem estar em YYYY-MM-DD");
  });

  it("normaliza chave de idempotência e bloqueia chaves inválidas", () => {
    expect(normalizeIdempotencyKey(" Telegram:123:456 ")).toBe("telegram:123:456");
    expect(() => normalizeIdempotencyKey("x")).toThrow("idempotency_key inválida");
  });

  it("cria compra parcelada preservando total e vencimentos", () => {
    const row = buildAssistantPurchase("user-1", {
      ...base,
      tipo_documento: "nota_fiscal",
      numero_documento: "NF-99",
      numero_parcelas: 3,
      vencimentos: ["2026-08-20", "2026-09-20", "2026-10-20"],
    });
    expect(row.valor_total).toBe(1250.5);
    expect(row.numero_parcelas).toBe(3);
    expect(row.parcelas).toHaveLength(3);
    expect(row.status_entrega).toBe("Pedido");
    expect(row.parcelas[0]).toHaveProperty("data_vencimento", "2026-08-20");
    expect(row.parcelas[0]).not.toHaveProperty("vencimento");
    expect(row.parcelas.reduce((sum, p) => sum + p.valor, 0)).toBeCloseTo(1250.5, 2);
    expect(row.nf_vinculada).toBe("NF-99");
  });

  it("marca nota fiscal quitada como transação paga", () => {
    const row = buildAssistantTransaction("user-1", {
      ...base,
      tipo_documento: "nota_fiscal",
      quitado: true,
      data_pagamento: "2026-08-10",
    });
    expect(row.status).toBe("pago");
    expect(row.data_pagamento).toBe("2026-08-10");
  });
});
