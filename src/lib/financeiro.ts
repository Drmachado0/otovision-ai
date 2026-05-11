export interface ParcelaCompraResumo {
  valor?: number | string | null;
  status?: string | null;
}

export interface CompraResumoInput {
  valor_total?: number | string | null;
  status_entrega?: string | null;
  numero_parcelas?: number | string | null;
  parcelas?: ParcelaCompraResumo[] | null;
  observacoes?: string | null;
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function compraEstaCancelada(compra: Pick<CompraResumoInput, "status_entrega">): boolean {
  return compra.status_entrega === "Cancelado";
}

export function compraEstaPaga(compra: Pick<CompraResumoInput, "status_entrega">): boolean {
  return compra.status_entrega === "Entregue";
}

export function calcularValorAPagarCompra(compra: CompraResumoInput): number {
  if (compraEstaCancelada(compra) || compraEstaPaga(compra)) return 0;

  const parcelas = Array.isArray(compra.parcelas) ? compra.parcelas : [];
  if (parcelas.length > 0) {
    return parcelas
      .filter((parcela) => parcela.status !== "Paga")
      .reduce((total, parcela) => total + toNumber(parcela.valor), 0);
  }

  return toNumber(compra.valor_total);
}

export function calcularResumoCompras(compras: CompraResumoInput[]) {
  const ativas = compras.filter((compra) => !compraEstaCancelada(compra));
  const totalCompromissado = ativas.reduce((total, compra) => total + toNumber(compra.valor_total), 0);
  const totalEntregueOuPago = ativas
    .filter((compra) => compraEstaPaga(compra))
    .reduce((total, compra) => total + toNumber(compra.valor_total), 0);
  const totalAPagar = ativas.reduce((total, compra) => total + calcularValorAPagarCompra(compra), 0);
  const pendentesEntrega = ativas.filter((compra) => compra.status_entrega !== "Entregue").length;

  return {
    totalCompromissado,
    totalEntregueOuPago,
    totalAPagar,
    pendentesEntrega,
  };
}
