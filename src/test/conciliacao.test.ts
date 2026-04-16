import { describe, it, expect } from "vitest";
import { calcMatchScore, type MovimentacaoExtraida, type Transacao } from "@/hooks/useConciliacao";

function makeMov(overrides: Partial<MovimentacaoExtraida> = {}): MovimentacaoExtraida {
  return {
    id: "mov-1",
    documento_id: "doc-1",
    data_movimentacao: "2024-03-15",
    descricao: "Pagamento cimento",
    valor: 1500,
    tipo_movimentacao: "saida",
    saldo: null,
    categoria_sugerida: "Material",
    score_confianca: 90,
    score_duplicidade: 0,
    status_revisao: "pendente",
    transacao_id: null,
    created_at: "2024-03-15T10:00:00Z",
    ...overrides,
  };
}

function makeTx(overrides: Partial<Transacao> = {}): Transacao {
  return {
    id: "tx-1",
    tipo: "Saída",
    descricao: "Compra cimento",
    categoria: "Material",
    valor: 1500,
    data: "2024-03-15",
    forma_pagamento: "PIX",
    conta_id: "",
    observacoes: "",
    referencia: "",
    origem_tipo: null,
    origem_id: null,
    conciliado: false,
    conciliado_em: null,
    ...overrides,
  };
}

describe("calcMatchScore", () => {
  it("score alto para match perfeito (valor, data, tipo, descrição)", () => {
    const mov = makeMov();
    const tx = makeTx();
    const { score, motivos } = calcMatchScore(mov, tx);
    expect(score).toBeGreaterThanOrEqual(85);
    expect(motivos).toContain("Valor exato");
    expect(motivos).toContain("Mesma data");
  });

  it("score menor quando valor difere", () => {
    const mov = makeMov({ valor: 1500 });
    const tx = makeTx({ valor: 3000 });
    const { score } = calcMatchScore(mov, tx);
    expect(score).toBeLessThan(60);
  });

  it("score menor quando data difere muito", () => {
    const mov = makeMov({ data_movimentacao: "2024-01-01" });
    const tx = makeTx({ data: "2024-06-01" });
    const { score } = calcMatchScore(mov, tx);
    expect(score).toBeLessThan(70);
  });

  it("score 0 para itens completamente diferentes", () => {
    const mov = makeMov({
      valor: 100,
      data_movimentacao: "2023-01-01",
      tipo_movimentacao: "entrada",
      descricao: "ABC",
    });
    const tx = makeTx({
      valor: 99999,
      data: "2025-12-31",
      tipo: "Saída",
      descricao: "XYZ",
    });
    const { score } = calcMatchScore(mov, tx);
    expect(score).toBeLessThan(20);
  });

  it("bonifica tipo compatível", () => {
    const mov = makeMov({ tipo_movimentacao: "saida" });
    const tx = makeTx({ tipo: "Saída" });
    const { motivos } = calcMatchScore(mov, tx);
    expect(motivos).toContain("Tipo compatível");
  });

  it("bonifica descrição semelhante", () => {
    const mov = makeMov({ descricao: "Pagamento cimento Portland" });
    const tx = makeTx({ descricao: "Pagamento cimento Portland CP-II" });
    const { motivos } = calcMatchScore(mov, tx);
    expect(motivos.some(m => m.includes("semelhante"))).toBe(true);
  });

  it("score limitado a 100", () => {
    const mov = makeMov();
    const tx = makeTx({ descricao: "Pagamento cimento" });
    const { score } = calcMatchScore(mov, tx);
    expect(score).toBeLessThanOrEqual(100);
  });
});
