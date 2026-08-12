import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const confirmar = readFileSync("src/components/ConfirmarPagamentoDialog.tsx", "utf8");
const pagamento = readFileSync("src/components/PagamentoDialog.tsx", "utf8");
const compraDrawer = readFileSync("src/components/CompraDetailDrawer.tsx", "utf8");

describe("componentes usam fonte única de pagamento", () => {
  it("Contas a Pagar usa payFinancialObligation para transação e parcela", () => {
    expect(confirmar).toContain('from "@/lib/financialPayments"');
    expect(confirmar).toContain("payFinancialObligation(supabase");
    expect(confirmar).toContain('const obligationType = parcelaCompra ? "purchase_installment" : "transaction"');
    expect(confirmar).toContain("obligationType,");
    expect(confirmar).not.toContain('rpc("pagar_parcela_atomica"');
    expect(confirmar).not.toContain("registrarComissaoParaTransacaoExistente");
    expect(confirmar).not.toContain('.from("obra_transacoes_fluxo")\n          .update');
  });

  it("Pagamento de NF e compra usa a mesma função transacional", () => {
    expect(pagamento).toContain('from "@/lib/financialPayments"');
    expect(pagamento).toContain("payFinancialObligation(supabase");
    expect(pagamento).toContain('const obligationType = tipo === "nf" ? "invoice" : "purchase"');
    expect(pagamento).toContain("obligationType,");
    expect(pagamento).not.toContain('rpc("pagar_nf_atomica"');
    expect(pagamento).not.toContain("registrarTransacaoComComissao");
    expect(pagamento).not.toContain('.from("obra_compras")\n          .update');
  });

  it("drawer de compra não possui caminho paralelo de pagamento parcelado", () => {
    expect(compraDrawer).not.toContain("handlePagarParcela");
    expect(compraDrawer).not.toContain("registrarTransacaoComComissao");
    expect(compraDrawer).toContain("ConfirmarPagamentoDialog");
  });
});
