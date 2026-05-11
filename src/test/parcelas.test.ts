import { describe, expect, it } from "vitest";
import { gerarParcelasCompra } from "@/lib/parcelas";

describe("gerarParcelasCompra", () => {
  it("divide o valor em parcelas mantendo soma exata em centavos", () => {
    const parcelas = gerarParcelasCompra(100, 3, "2026-05-11");

    expect(parcelas.map((p) => p.valor)).toEqual([33.33, 33.33, 33.34]);
    expect(parcelas.reduce((total, p) => Math.round((total + p.valor) * 100) / 100, 0)).toBe(100);
  });

  it("gera vencimentos mensais em data local sem pular mês no fim do mês", () => {
    const parcelas = gerarParcelasCompra(300, 3, "2026-01-31");

    expect(parcelas.map((p) => p.data_vencimento)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
    ]);
  });

  it("não gera parcelas inválidas", () => {
    expect(gerarParcelasCompra(0, 3, "2026-05-11")).toEqual([]);
    expect(gerarParcelasCompra(100, 0, "2026-05-11")).toEqual([]);
    expect(gerarParcelasCompra(100, 2.5, "2026-05-11")).toEqual([]);
  });
});
