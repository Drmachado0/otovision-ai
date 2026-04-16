import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate, formatPercent, formatMes } from "@/lib/formatters";

describe("formatCurrency", () => {
  it("formata valor em BRL", () => {
    const result = formatCurrency(1500.5);
    expect(result).toContain("1.500,50");
  });

  it("formata zero", () => {
    const result = formatCurrency(0);
    expect(result).toContain("0,00");
  });

  it("formata valor negativo", () => {
    const result = formatCurrency(-250);
    expect(result).toContain("250,00");
  });
});

describe("formatDate", () => {
  it("formata data ISO para pt-BR", () => {
    const result = formatDate("2024-03-15");
    // Timezone pode variar, aceita dia 14 ou 15
    expect(result).toMatch(/1[45]\/03\/2024/);
  });

  it("retorna traço para data vazia", () => {
    expect(formatDate("")).toBe("-");
  });

  it("retorna a data original se inválida", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});

describe("formatPercent", () => {
  it("formata porcentagem com 1 casa decimal", () => {
    expect(formatPercent(85.67)).toBe("85.7%");
  });

  it("formata zero", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });
});

describe("formatMes", () => {
  it("converte YYYY-MM para nome do mês", () => {
    expect(formatMes("2024-01")).toBe("Janeiro/2024");
    expect(formatMes("2024-12")).toBe("Dezembro/2024");
  });

  it("retorna traço para vazio", () => {
    expect(formatMes("")).toBe("-");
  });

  it("retorna original se formato inesperado", () => {
    expect(formatMes("jan-2024")).toBe("jan-2024");
  });
});
