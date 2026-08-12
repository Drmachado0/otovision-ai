import { describe, expect, it } from "vitest";
import { parseParcelas } from "@/components/CompraDetailDrawer";

describe("parseParcelas", () => {
  it("mantém apenas parcelas estruturalmente válidas", () => {
    expect(parseParcelas([
      { numero: 1, valor: 100, data_vencimento: "2026-08-20", status: "Pendente" },
      { numero: 0, valor: 100, data_vencimento: "2026-08-20", status: "Pendente" },
      { numero: 2, valor: -1, data_vencimento: "2026-08-20", status: "Pendente" },
      { numero: 3, valor: 100, data_vencimento: "inválida", status: "Pendente" },
      { numero: 4, valor: 100, data_vencimento: "2026-08-20", status: null },
    ])).toEqual([
      { numero: 1, valor: 100, data_vencimento: "2026-08-20", status: "Pendente" },
    ]);
  });

  it("rejeita entradas que não são arrays", () => {
    expect(parseParcelas(null)).toEqual([]);
    expect(parseParcelas({ numero: 1 })).toEqual([]);
  });
});
