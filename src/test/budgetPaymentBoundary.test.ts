import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/pages/OrcamentosPage.tsx", "utf8");
const sheet = readFileSync("src/pages/orcamentos/OrcamentoDetailSheet.tsx", "utf8");

describe("orçamento não é obrigação financeira", () => {
  it("não envia UUID de orçamento ao diálogo de compra", () => {
    expect(page).not.toContain("pagamentoOrcamento");
    expect(page).not.toContain("tipo=\"compra\"");
    expect(page).not.toContain("<PagamentoDialog");
  });

  it("oferece conversão em compra, não pagamento direto", () => {
    expect(sheet).not.toContain("onPagar");
    expect(sheet).not.toContain("Pagar Orçamento");
    expect(sheet).toContain("Converter em Compra");
  });
});
