import { describe, expect, it } from "vitest";
import { calcularResumoCompras, calcularValorAPagarCompra } from "@/lib/financeiro";

describe("calcularValorAPagarCompra", () => {
  it("trata compra única pendente como compromisso a pagar sem lançar fluxo", () => {
    expect(calcularValorAPagarCompra({ valor_total: 1000, status_entrega: "Pedido", parcelas: [] })).toBe(1000);
  });

  it("ignora compras entregues/pagas e canceladas", () => {
    expect(calcularValorAPagarCompra({ valor_total: 1000, status_entrega: "Entregue" })).toBe(0);
    expect(calcularValorAPagarCompra({ valor_total: 1000, status_entrega: "Cancelado" })).toBe(0);
  });

  it("soma apenas parcelas ainda não pagas", () => {
    expect(calcularValorAPagarCompra({
      valor_total: 900,
      status_entrega: "Pedido",
      parcelas: [
        { valor: 300, status: "Paga" },
        { valor: 300, status: "Pendente" },
        { valor: 300, status: "Pendente" },
      ],
    })).toBe(600);
  });
});

describe("calcularResumoCompras", () => {
  it("separa total compromissado do valor real a pagar", () => {
    const resumo = calcularResumoCompras([
      { valor_total: 1000, status_entrega: "Entregue" },
      { valor_total: 800, status_entrega: "Pedido" },
      {
        valor_total: 900,
        status_entrega: "Pedido",
        parcelas: [
          { valor: 300, status: "Paga" },
          { valor: 300, status: "Pendente" },
          { valor: 300, status: "Pendente" },
        ],
      },
      { valor_total: 500, status_entrega: "Cancelado" },
    ]);

    expect(resumo.totalCompromissado).toBe(2700);
    expect(resumo.totalEntregueOuPago).toBe(1000);
    expect(resumo.totalAPagar).toBe(1400);
    expect(resumo.pendentesEntrega).toBe(2);
  });
});
