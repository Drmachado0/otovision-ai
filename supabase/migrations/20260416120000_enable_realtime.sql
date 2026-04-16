-- Enable realtime for all financial tables
-- This is required for useRealtimeSubscription to work

ALTER PUBLICATION supabase_realtime ADD TABLE public.obra_transacoes_fluxo;
ALTER PUBLICATION supabase_realtime ADD TABLE public.obra_comissao_pagamentos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.obra_compras;
ALTER PUBLICATION supabase_realtime ADD TABLE public.obra_contas_financeiras;
ALTER PUBLICATION supabase_realtime ADD TABLE public.obra_config;
ALTER PUBLICATION supabase_realtime ADD TABLE public.obra_cronograma;
ALTER PUBLICATION supabase_realtime ADD TABLE public.obra_notificacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.obra_documentos_processados;
ALTER PUBLICATION supabase_realtime ADD TABLE public.obra_movimentacoes_extraidas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.obra_conciliacoes_bancarias;
ALTER PUBLICATION supabase_realtime ADD TABLE public.obra_audit_log;

-- Set REPLICA IDENTITY FULL for accurate change tracking
ALTER TABLE public.obra_transacoes_fluxo REPLICA IDENTITY FULL;
ALTER TABLE public.obra_comissao_pagamentos REPLICA IDENTITY FULL;
ALTER TABLE public.obra_compras REPLICA IDENTITY FULL;
ALTER TABLE public.obra_contas_financeiras REPLICA IDENTITY FULL;
ALTER TABLE public.obra_config REPLICA IDENTITY FULL;
ALTER TABLE public.obra_cronograma REPLICA IDENTITY FULL;
ALTER TABLE public.obra_notificacoes REPLICA IDENTITY FULL;
