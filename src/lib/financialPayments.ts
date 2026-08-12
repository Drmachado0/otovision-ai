export type FinancialObligationType = "transaction" | "purchase" | "purchase_installment" | "invoice";

export interface FinancialPaymentInput {
  obligationType: FinancialObligationType;
  obligationId: string;
  installmentNumber?: number;
  accountId: string;
  method: string;
  paidAt: string;
  generateCommission: boolean;
  receiptPath?: string;
  idempotencyKey?: string;
}

export interface FinancialPaymentResult {
  operation_id: string;
  transaction_id: string;
  commission_id: string | null;
  obligation_type: FinancialObligationType;
  obligation_id: string;
  installment_number: number | null;
  paid_at: string;
  idempotent_replay: boolean;
}

// Supabase generates RPC overloads from the remote schema. This helper also needs
// to compile before the new migration is reflected in generated types.
interface RpcClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc: any;
}

export function buildPaymentIdempotencyKey(
  obligationType: FinancialObligationType,
  obligationId: string,
  installmentNumber?: number,
): string {
  const unit = obligationType === "purchase_installment"
    ? String(installmentNumber)
    : "whole";
  return `payment:${obligationType}:${obligationId}:${unit}`;
}

export async function payFinancialObligation(
  supabase: RpcClient,
  input: FinancialPaymentInput,
): Promise<FinancialPaymentResult> {
  const { data, error } = await supabase.rpc("pay_financial_obligation", {
    p_obligation_type: input.obligationType,
    p_obligation_id: input.obligationId,
    p_installment_number: input.installmentNumber ?? null,
    p_account_id: input.accountId,
    p_method: input.method,
    p_paid_at: input.paidAt,
    p_generate_commission: input.generateCommission,
    p_idempotency_key: input.idempotencyKey ?? buildPaymentIdempotencyKey(
      input.obligationType,
      input.obligationId,
      input.installmentNumber,
    ),
    p_receipt_path: input.receiptPath || null,
  });

  if (error) throw error;
  if (!data) throw new Error("Pagamento não retornou confirmação transacional");
  return data;
}
