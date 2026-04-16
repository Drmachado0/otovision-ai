-- BUG-002: Saídas pendentes podem ter conta_id = null
-- (a conta e definida no ato do pagamento em Contas a Pagar)
ALTER TABLE public.obra_transacoes_fluxo
  ALTER COLUMN conta_id DROP NOT NULL;
