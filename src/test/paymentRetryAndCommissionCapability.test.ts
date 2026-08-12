import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pagamento = readFileSync("src/components/PagamentoDialog.tsx", "utf8");
const confirmar = readFileSync("src/components/ConfirmarPagamentoDialog.tsx", "utf8");

describe("retry seguro de pagamento e capability de comissão", () => {
  for (const [name, source] of [["PagamentoDialog", pagamento], ["ConfirmarPagamentoDialog", confirmar]] as const) {
    it(`${name} usa caminho determinístico e verifica registro documental`, () => {
      expect(source).toContain("buildPaymentIdempotencyKey");
      expect(source).toContain("operationKey");
      expect(source).toContain("upsert: true");
      expect(source).not.toContain("Date.now()");
      expect(source).toContain("documentError");
    });

    it(`${name} não habilita comissão por padrão para usuário financeiro`, () => {
      expect(source).toContain("useUserRole");
      expect(source).toContain("permissions.canEditComissao");
      expect(source).toContain("useState(false)");
    });
  }
});
