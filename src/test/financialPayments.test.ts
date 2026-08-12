import { describe, expect, it, vi } from "vitest";
import { buildPaymentIdempotencyKey, payFinancialObligation } from "@/lib/financialPayments";

describe("pagamentos financeiros unificados", () => {
  it("gera identidade estável e distinta para cada parcela", () => {
    expect(buildPaymentIdempotencyKey("purchase_installment", "compra-1", 1))
      .toBe("payment:purchase_installment:compra-1:1");
    expect(buildPaymentIdempotencyKey("purchase_installment", "compra-1", 2))
      .toBe("payment:purchase_installment:compra-1:2");
    expect(buildPaymentIdempotencyKey("purchase", "compra-1"))
      .toBe("payment:purchase:compra-1:whole");
  });

  it("envia somente dados operacionais e não confia em valor ou categoria do cliente", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { transaction_id: "tx-1", commission_id: "commission-1" },
      error: null,
    });
    const supabase = { rpc };

    const result = await payFinancialObligation(supabase, {
      obligationType: "purchase_installment",
      obligationId: "compra-1",
      installmentNumber: 2,
      accountId: "account-1",
      method: "PIX",
      generateCommission: true,
      paidAt: "2026-08-12T12:00:00.000Z",
      receiptPath: "user/receipt.pdf",
    });

    expect(rpc).toHaveBeenCalledWith("pay_financial_obligation", {
      p_obligation_type: "purchase_installment",
      p_obligation_id: "compra-1",
      p_installment_number: 2,
      p_account_id: "account-1",
      p_method: "PIX",
      p_paid_at: "2026-08-12T12:00:00.000Z",
      p_generate_commission: true,
      p_idempotency_key: "payment:purchase_installment:compra-1:2",
      p_receipt_path: "user/receipt.pdf",
    });
    expect(result.transaction_id).toBe("tx-1");
  });

  it("propaga erro da RPC sem confirmar pagamento parcial", async () => {
    const error = new Error("falha transacional");
    const supabase = { rpc: vi.fn().mockResolvedValue({ data: null, error }) };
    await expect(payFinancialObligation(supabase, {
      obligationType: "transaction",
      obligationId: "tx-1",
      accountId: "account-1",
      method: "Boleto",
      generateCommission: false,
      paidAt: "2026-08-12T12:00:00.000Z",
    })).rejects.toThrow("falha transacional");
  });
});
