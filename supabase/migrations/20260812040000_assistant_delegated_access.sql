-- Acesso delegado, revogável e auditável para o assistente de lançamentos.
-- Tokens nunca são armazenados em texto puro: somente SHA-256 + prefixo de identificação.

CREATE TABLE IF NOT EXISTS public.obra_assistant_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Hermes Telegram',
  token_hash TEXT NOT NULL,
  token_prefix TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read', 'launch']::TEXT[],
  default_account_id UUID NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT obra_assistant_delegations_token_hash_format CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT obra_assistant_delegations_token_prefix_format CHECK (token_prefix ~ '^ova_[A-Za-z0-9_-]{8}$'),
  CONSTRAINT obra_assistant_delegations_scopes CHECK (scopes <@ ARRAY['read', 'launch']::TEXT[])
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assistant_delegations_token_hash
  ON public.obra_assistant_delegations(token_hash);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assistant_delegations_one_enabled_per_user
  ON public.obra_assistant_delegations(user_id)
  WHERE enabled = true;

CREATE INDEX IF NOT EXISTS idx_assistant_delegations_user
  ON public.obra_assistant_delegations(user_id, created_at DESC);

-- Validação multi-tenant sem criar índices/constraints pesadas em tabelas legadas.
CREATE OR REPLACE FUNCTION public.validate_assistant_delegation_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.obra_contas_financeiras a
    WHERE a.id = NEW.default_account_id AND a.user_id = NEW.user_id AND a.ativa = true
  ) THEN
    RAISE EXCEPTION 'Conta padrão não pertence ao usuário ou está inativa' USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_assistant_delegation_account ON public.obra_assistant_delegations;
CREATE CONSTRAINT TRIGGER validate_assistant_delegation_account
  AFTER INSERT OR UPDATE ON public.obra_assistant_delegations
  DEFERRABLE INITIALLY IMMEDIATE
  FOR EACH ROW EXECUTE FUNCTION public.validate_assistant_delegation_account();

ALTER TABLE public.obra_assistant_delegations ENABLE ROW LEVEL SECURITY;

-- A interface pode exibir apenas metadados da delegação ao dono administrador.
-- O token em texto puro nunca está nesta tabela.
DROP POLICY IF EXISTS "Admins can view own assistant delegation metadata" ON public.obra_assistant_delegations;
CREATE POLICY "Admins can view own assistant delegation metadata"
  ON public.obra_assistant_delegations
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

-- Ativação/revogação e uso são feitos exclusivamente pela Edge Function com service role.
-- Não há policies de INSERT/UPDATE/DELETE para clientes autenticados.

CREATE TABLE IF NOT EXISTS public.obra_assistant_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegation_id UUID NOT NULL REFERENCES public.obra_assistant_delegations(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  document_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  request_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  response_payload JSONB,
  result_table TEXT,
  result_id UUID,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT obra_assistant_operations_idempotency_format CHECK (
    char_length(idempotency_key) BETWEEN 8 AND 200
    AND idempotency_key ~ '^[a-z0-9:_./-]+$'
  ),
  CONSTRAINT obra_assistant_operations_document_hash_format CHECK (document_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT obra_assistant_operations_status CHECK (status IN ('processing', 'completed', 'failed')),
  CONSTRAINT obra_assistant_operations_result_table CHECK (
    result_table IS NULL OR result_table IN ('obra_transacoes_fluxo', 'obra_compras')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assistant_operations_idempotency
  ON public.obra_assistant_operations(delegation_id, idempotency_key);

-- Um mesmo arquivo só pode estar em processamento ou concluído uma vez por usuário.
-- Falhas saem do índice e podem ser tentadas novamente com uma nova operação.
CREATE UNIQUE INDEX IF NOT EXISTS idx_assistant_operations_document_completed
  ON public.obra_assistant_operations(user_id, document_hash)
  WHERE status IN ('processing', 'completed');

CREATE INDEX IF NOT EXISTS idx_assistant_operations_user_created
  ON public.obra_assistant_operations(user_id, created_at DESC);

-- Eventos sanitizados de rejeição ficam fora da transação financeira para
-- preservar evidência sem armazenar token, corpo completo ou dados do documento.
CREATE TABLE IF NOT EXISTS public.obra_assistant_security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegation_id UUID NOT NULL REFERENCES public.obra_assistant_delegations(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  idempotency_key TEXT,
  document_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT obra_assistant_security_events_reason CHECK (
    reason IN ('validation_rejected', 'account_rejected', 'category_rejected', 'launch_conflict', 'launch_failed')
  ),
  CONSTRAINT obra_assistant_security_events_idempotency CHECK (
    idempotency_key IS NULL OR idempotency_key ~ '^[a-z0-9:_./-]{8,200}$'
  ),
  CONSTRAINT obra_assistant_security_events_hash CHECK (
    document_hash IS NULL OR document_hash ~ '^[a-f0-9]{64}$'
  )
);

CREATE INDEX IF NOT EXISTS idx_assistant_security_events_user_created
  ON public.obra_assistant_security_events(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.validate_assistant_security_event_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.obra_assistant_delegations d
    WHERE d.id = NEW.delegation_id AND d.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Delegação não pertence ao usuário do evento de segurança' USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_assistant_security_event_tenant ON public.obra_assistant_security_events;
CREATE CONSTRAINT TRIGGER validate_assistant_security_event_tenant
  AFTER INSERT OR UPDATE ON public.obra_assistant_security_events
  DEFERRABLE INITIALLY IMMEDIATE
  FOR EACH ROW EXECUTE FUNCTION public.validate_assistant_security_event_tenant();

ALTER TABLE public.obra_assistant_security_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view own assistant security events" ON public.obra_assistant_security_events;
CREATE POLICY "Admins can view own assistant security events"
  ON public.obra_assistant_security_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.validate_assistant_operation_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.obra_assistant_delegations d
    WHERE d.id = NEW.delegation_id AND d.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Delegação não pertence ao usuário da operação' USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_assistant_operation_tenant ON public.obra_assistant_operations;
CREATE CONSTRAINT TRIGGER validate_assistant_operation_tenant
  AFTER INSERT OR UPDATE ON public.obra_assistant_operations
  DEFERRABLE INITIALLY IMMEDIATE
  FOR EACH ROW EXECUTE FUNCTION public.validate_assistant_operation_tenant();

ALTER TABLE public.obra_assistant_operations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view own assistant operations" ON public.obra_assistant_operations;
CREATE POLICY "Admins can view own assistant operations"
  ON public.obra_assistant_operations
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

-- Evita adulteração e acesso direto: operações são escritas apenas via service role.

CREATE OR REPLACE FUNCTION public.touch_assistant_delegation_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_assistant_delegation_updated_at ON public.obra_assistant_delegations;
CREATE TRIGGER touch_assistant_delegation_updated_at
  BEFORE UPDATE ON public.obra_assistant_delegations
  FOR EACH ROW EXECUTE FUNCTION public.touch_assistant_delegation_updated_at();

-- Triggers existentes registram service-role como UUID zero. Estes triggers adicionais
-- preservam a trilha explícita da criação da delegação/operação sem expor tokens.
CREATE OR REPLACE FUNCTION public.audit_assistant_delegation_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.label IS NOT DISTINCT FROM NEW.label
     AND OLD.enabled IS NOT DISTINCT FROM NEW.enabled
     AND OLD.scopes IS NOT DISTINCT FROM NEW.scopes
     AND OLD.default_account_id IS NOT DISTINCT FROM NEW.default_account_id
     AND OLD.expires_at IS NOT DISTINCT FROM NEW.expires_at
     AND OLD.revoked_at IS NOT DISTINCT FROM NEW.revoked_at THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.obra_audit_log (
    user_id, user_email, acao, tabela, registro_id, dados_anteriores, dados_novos
  ) VALUES (
    NEW.user_id,
    'assistente@otovision.local',
    CASE WHEN TG_OP = 'INSERT' THEN 'delegação_criada' ELSE 'delegação_alterada' END,
    TG_TABLE_NAME,
    NEW.id::TEXT,
    CASE WHEN TG_OP = 'UPDATE' THEN jsonb_build_object(
      'enabled', OLD.enabled, 'scopes', OLD.scopes, 'default_account_id', OLD.default_account_id,
      'expires_at', OLD.expires_at, 'revoked_at', OLD.revoked_at
    ) ELSE NULL END,
    jsonb_build_object(
      'label', NEW.label, 'token_prefix', NEW.token_prefix, 'enabled', NEW.enabled,
      'scopes', NEW.scopes, 'default_account_id', NEW.default_account_id,
      'expires_at', NEW.expires_at, 'revoked_at', NEW.revoked_at
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_assistant_delegation ON public.obra_assistant_delegations;
CREATE TRIGGER audit_assistant_delegation
  AFTER INSERT OR UPDATE ON public.obra_assistant_delegations
  FOR EACH ROW EXECUTE FUNCTION public.audit_assistant_delegation_change();

-- Rotação atômica: o token anterior só é revogado se a nova delegação puder ser criada.
CREATE OR REPLACE FUNCTION public.rotate_assistant_delegation(
  p_user_id UUID,
  p_label TEXT,
  p_token_hash TEXT,
  p_token_prefix TEXT,
  p_default_account_id UUID,
  p_expires_at TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::TEXT, 0));
  IF NOT EXISTS (
    SELECT 1 FROM public.obra_contas_financeiras
    WHERE user_id = p_user_id AND id = p_default_account_id AND ativa = true
  ) THEN
    RAISE EXCEPTION 'Conta padrão ativa não encontrada' USING ERRCODE = '22023';
  END IF;

  UPDATE public.obra_assistant_delegations
  SET enabled = false, revoked_at = now()
  WHERE user_id = p_user_id AND enabled = true;

  INSERT INTO public.obra_assistant_delegations (
    user_id, label, token_hash, token_prefix, scopes, default_account_id, expires_at
  ) VALUES (
    p_user_id, left(p_label, 100), p_token_hash, p_token_prefix,
    ARRAY['read', 'launch']::TEXT[], p_default_account_id, p_expires_at
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Revogação usa a mesma trava de rotação, leitura e lançamento.
CREATE OR REPLACE FUNCTION public.revoke_assistant_delegation(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::TEXT, 0));
  UPDATE public.obra_assistant_delegations
  SET enabled = false, revoked_at = now()
  WHERE user_id = p_user_id AND enabled = true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Leitura transacional: autorização e SELECT compartilham a trava de revogação.
-- Os recursos e campos são enumerados estaticamente; não há SQL dinâmico.
CREATE OR REPLACE FUNCTION public.read_assistant_context(
  p_delegation_id UUID,
  p_user_id UUID,
  p_resource TEXT,
  p_limit INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data JSONB;
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::TEXT, 0));
  IF NOT EXISTS (
    SELECT 1 FROM public.obra_assistant_delegations d
    WHERE d.id = p_delegation_id AND d.user_id = p_user_id AND d.enabled = true
      AND (d.expires_at IS NULL OR d.expires_at > now()) AND d.scopes @> ARRAY['read']::TEXT[]
  ) THEN
    RAISE EXCEPTION 'Delegação inválida ou expirada' USING ERRCODE = '28000';
  END IF;

  IF p_resource = 'resumo' THEN
    SELECT jsonb_build_object(
      'resources', ARRAY['config','contas','categorias','fornecedores','transacoes','compras','documentos','auditoria'],
      'counts', jsonb_build_object(
        'config', (SELECT count(*) FROM public.obra_config WHERE user_id = p_user_id),
        'contas', (SELECT count(*) FROM public.obra_contas_financeiras WHERE user_id = p_user_id),
        'categorias', (SELECT count(*) FROM public.obra_categorias WHERE user_id = p_user_id AND deleted_at IS NULL),
        'fornecedores', (SELECT count(*) FROM public.obra_fornecedores WHERE user_id = p_user_id AND deleted_at IS NULL),
        'transacoes', (SELECT count(*) FROM public.obra_transacoes_fluxo WHERE user_id = p_user_id AND deleted_at IS NULL),
        'compras', (SELECT count(*) FROM public.obra_compras WHERE user_id = p_user_id AND deleted_at IS NULL)
      )
    ) INTO v_data;
  ELSIF p_resource = 'config' THEN
    SELECT COALESCE(jsonb_agg(x), '[]'::JSONB) INTO v_data FROM (
      SELECT id,nome_obra,orcamento_total,area_construida,data_inicio,data_termino,responsavel
      FROM public.obra_config WHERE user_id = p_user_id LIMIT v_limit
    ) x;
  ELSIF p_resource = 'contas' THEN
    SELECT COALESCE(jsonb_agg(x), '[]'::JSONB) INTO v_data FROM (
      SELECT id,nome,tipo,ativa,saldo_inicial,observacoes FROM public.obra_contas_financeiras
      WHERE user_id = p_user_id ORDER BY nome LIMIT v_limit
    ) x;
  ELSIF p_resource = 'categorias' THEN
    SELECT COALESCE(jsonb_agg(x), '[]'::JSONB) INTO v_data FROM (
      SELECT id,nome FROM public.obra_categorias WHERE user_id = p_user_id AND deleted_at IS NULL ORDER BY nome LIMIT v_limit
    ) x;
  ELSIF p_resource = 'fornecedores' THEN
    SELECT COALESCE(jsonb_agg(x), '[]'::JSONB) INTO v_data FROM (
      SELECT id,nome,cnpj,especialidade,status,avaliacao,observacoes FROM public.obra_fornecedores
      WHERE user_id = p_user_id AND deleted_at IS NULL ORDER BY nome LIMIT v_limit
    ) x;
  ELSIF p_resource = 'transacoes' THEN
    SELECT COALESCE(jsonb_agg(x), '[]'::JSONB) INTO v_data FROM (
      SELECT id,tipo,valor,data,data_vencimento,data_pagamento,categoria,descricao,forma_pagamento,conta_id,status,
             referencia,origem_tipo,origem_id,created_at FROM public.obra_transacoes_fluxo
      WHERE user_id = p_user_id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT v_limit
    ) x;
  ELSIF p_resource = 'compras' THEN
    SELECT COALESCE(jsonb_agg(x), '[]'::JSONB) INTO v_data FROM (
      SELECT id,fornecedor,fornecedor_id,descricao,categoria,valor_total,data,forma_pagamento,numero_parcelas,
             parcelas,status_entrega,conta_id,nf_vinculada,created_at FROM public.obra_compras
      WHERE user_id = p_user_id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT v_limit
    ) x;
  ELSIF p_resource = 'documentos' THEN
    SELECT COALESCE(jsonb_agg(x), '[]'::JSONB) INTO v_data FROM (
      SELECT id,nome_arquivo,tipo_documento,status_processamento,confianca_extracao,duplicidade_status,
             duplicidade_score,motivo_revisao,hash_arquivo,created_at FROM public.obra_documentos_processados
      WHERE user_id = p_user_id ORDER BY created_at DESC LIMIT v_limit
    ) x;
  ELSIF p_resource = 'auditoria' THEN
    SELECT COALESCE(jsonb_agg(x), '[]'::JSONB) INTO v_data FROM (
      SELECT id,acao,tabela,registro_id,dados_novos,created_at FROM public.obra_audit_log
      WHERE user_id = p_user_id ORDER BY created_at DESC LIMIT v_limit
    ) x;
  ELSE
    RAISE EXCEPTION 'Recurso de leitura não permitido' USING ERRCODE = '22023';
  END IF;

  UPDATE public.obra_assistant_delegations SET last_used_at = now() WHERE id = p_delegation_id;
  RETURN CASE WHEN p_resource = 'resumo' THEN v_data
    ELSE jsonb_build_object('resource', p_resource, 'count', jsonb_array_length(v_data), 'data', v_data)
  END;
END;
$$;

-- Lançamento atômico: idempotência, registro financeiro, conclusão e auditoria
-- são confirmados juntos ou integralmente revertidos pelo PostgreSQL.
CREATE OR REPLACE FUNCTION public.create_assistant_launch(
  p_delegation_id UUID,
  p_user_id UUID,
  p_idempotency_key TEXT,
  p_document_hash TEXT,
  p_request_payload JSONB,
  p_result_table TEXT,
  p_row JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operation public.obra_assistant_operations%ROWTYPE;
  v_operation_id UUID := gen_random_uuid();
  v_record_id UUID;
  v_response JSONB;
  v_parcel_count INTEGER;
  v_parcel_total NUMERIC;
BEGIN
  -- Serializa os lançamentos por usuário. Isso cobre simultaneamente conflitos
  -- por chave de idempotência e por hash sem deixar registros `processing` órfãos.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::TEXT, 0));

  IF NOT EXISTS (
    SELECT 1 FROM public.obra_assistant_delegations d
    WHERE d.id = p_delegation_id AND d.user_id = p_user_id AND d.enabled = true
      AND (d.expires_at IS NULL OR d.expires_at > now()) AND d.scopes @> ARRAY['launch']::TEXT[]
  ) THEN
    RAISE EXCEPTION 'Delegação inválida ou expirada' USING ERRCODE = '28000';
  END IF;
  IF p_row->>'user_id' IS DISTINCT FROM p_user_id::TEXT THEN
    RAISE EXCEPTION 'Usuário do lançamento diverge da delegação' USING ERRCODE = '42501';
  END IF;
  IF p_idempotency_key !~ '^[a-z0-9:_./-]{8,200}$'
     OR p_document_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Idempotência ou hash documental inválido' USING ERRCODE = '22023';
  END IF;
  IF p_request_payload->>'tipo_documento' IS NULL
     OR p_request_payload->>'tipo_documento' NOT IN ('boleto', 'recibo', 'nota_fiscal', 'comprovante')
     OR COALESCE((p_request_payload->>'confianca')::NUMERIC NOT BETWEEN 80 AND 100, true)
     OR (p_request_payload->>'ambiguo')::BOOLEAN IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Documento exige revisão' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.obra_contas_financeiras a
    WHERE a.user_id = p_user_id AND a.id = (p_row->>'conta_id')::UUID AND a.ativa = true
  ) THEN
    RAISE EXCEPTION 'Conta financeira inválida para o usuário' USING ERRCODE = '23503';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.obra_categorias c
    WHERE c.user_id = p_user_id AND c.nome = p_row->>'categoria' AND c.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Categoria inválida para o usuário' USING ERRCODE = '23503';
  END IF;

  SELECT o.* INTO v_operation FROM public.obra_assistant_operations o
  WHERE o.delegation_id = p_delegation_id AND o.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_operation.document_hash IS DISTINCT FROM p_document_hash
       OR v_operation.request_payload IS DISTINCT FROM p_request_payload THEN
      RAISE EXCEPTION 'Chave de idempotência reutilizada para outro pedido' USING ERRCODE = '22023';
    END IF;
    RETURN CASE WHEN v_operation.status = 'completed'
      THEN COALESCE(v_operation.response_payload, '{}'::JSONB) || jsonb_build_object('idempotent_replay', true)
      ELSE jsonb_build_object('error', 'Operação anterior não concluída', 'conflict', true)
    END;
  END IF;

  SELECT o.* INTO v_operation FROM public.obra_assistant_operations o
  WHERE o.user_id = p_user_id AND o.document_hash = p_document_hash AND o.status = 'completed';
  IF FOUND THEN
    RETURN jsonb_build_object(
      'error', 'Documento já lançado', 'duplicate', true,
      'operation_id', v_operation.id, 'record_id', v_operation.result_id
    );
  END IF;

  INSERT INTO public.obra_assistant_operations (
    id, delegation_id, user_id, idempotency_key, document_hash, request_payload, status
  ) VALUES (
    v_operation_id, p_delegation_id, p_user_id, p_idempotency_key,
    p_document_hash, p_request_payload, 'processing'
  );

  IF p_result_table = 'obra_compras' THEN
    IF p_request_payload->>'tipo_documento' IS DISTINCT FROM 'nota_fiscal'
       OR COALESCE((p_request_payload->>'quitado')::BOOLEAN, false)
       OR round((p_row->>'valor_total')::NUMERIC, 2) IS DISTINCT FROM round((p_request_payload->>'valor')::NUMERIC, 2)
       OR p_row->>'data' IS DISTINCT FROM p_request_payload->>'data_documento'
       OR p_row->>'descricao' IS DISTINCT FROM btrim(p_request_payload->>'descricao')
       OR p_row->>'categoria' IS DISTINCT FROM btrim(p_request_payload->>'categoria')
       OR p_row->>'forma_pagamento' IS DISTINCT FROM btrim(p_request_payload->>'forma_pagamento')
       OR p_row->>'conta_id' IS DISTINCT FROM p_request_payload->>'conta_id'
       OR p_row->>'status_entrega' IS DISTINCT FROM 'Pedido'
       OR (p_row->>'valor_total')::NUMERIC <= 0
       OR (p_row->>'numero_parcelas')::INTEGER NOT BETWEEN 1 AND 120
       OR jsonb_typeof(p_row->'parcelas') IS DISTINCT FROM 'array'
       OR jsonb_array_length(p_row->'parcelas') <> (p_row->>'numero_parcelas')::INTEGER THEN
      RAISE EXCEPTION 'Linha financeira diverge do documento validado' USING ERRCODE = '22023';
    END IF;
    SELECT count(*), COALESCE(sum((parcela->>'valor')::NUMERIC), 0)
      INTO v_parcel_count, v_parcel_total
    FROM jsonb_array_elements(p_row->'parcelas') parcela
    WHERE (parcela->>'numero')::INTEGER > 0
      AND (parcela->>'valor')::NUMERIC > 0
      AND (parcela->>'data_vencimento')::DATE IS NOT NULL
      AND parcela->>'status' = 'Pendente';
    IF v_parcel_count <> (p_row->>'numero_parcelas')::INTEGER
       OR abs(v_parcel_total - (p_row->>'valor_total')::NUMERIC) >= 0.005 THEN
      RAISE EXCEPTION 'Parcelas inválidas' USING ERRCODE = '22023';
    END IF;
    PERFORM set_config('request.jwt.claims', jsonb_build_object(
      'sub', p_user_id::TEXT, 'email', 'assistente@otovision.local'
    )::TEXT, true);
    INSERT INTO public.obra_compras (
      user_id, fornecedor, descricao, categoria, valor_total, data, status_entrega,
      forma_pagamento, numero_parcelas, parcelas, observacoes, conta_id, nf_vinculada
    ) VALUES (
      p_user_id, p_row->>'fornecedor', p_row->>'descricao', p_row->>'categoria',
      (p_row->>'valor_total')::NUMERIC, (p_row->>'data')::DATE, p_row->>'status_entrega',
      p_row->>'forma_pagamento', (p_row->>'numero_parcelas')::INTEGER,
      p_row->'parcelas', p_row->>'observacoes', (p_row->>'conta_id')::UUID, p_row->>'nf_vinculada'
    ) RETURNING id INTO v_record_id;
  ELSIF p_result_table = 'obra_transacoes_fluxo' THEN
    IF (p_row->>'valor')::NUMERIC <= 0 THEN
      RAISE EXCEPTION 'Valor do lançamento deve ser positivo' USING ERRCODE = '22023';
    END IF;
    IF p_row->>'tipo' IS DISTINCT FROM 'Saída'
       OR round((p_row->>'valor')::NUMERIC, 2) IS DISTINCT FROM round((p_request_payload->>'valor')::NUMERIC, 2)
       OR p_row->>'data' IS DISTINCT FROM (CASE
            WHEN p_request_payload->>'tipo_documento' = 'boleto'
              THEN p_request_payload->>'data_vencimento'
            ELSE p_request_payload->>'data_documento'
          END)
       OR p_row->>'descricao' IS DISTINCT FROM btrim(p_request_payload->>'descricao')
       OR p_row->>'categoria' IS DISTINCT FROM btrim(p_request_payload->>'categoria')
       OR p_row->>'forma_pagamento' IS DISTINCT FROM btrim(p_request_payload->>'forma_pagamento')
       OR p_row->>'conta_id' IS DISTINCT FROM p_request_payload->>'conta_id'
       OR NULLIF(p_row->>'data_vencimento', '') IS DISTINCT FROM NULLIF(p_request_payload->>'data_vencimento', '')
       OR NULLIF(p_row->>'data_pagamento', '') IS DISTINCT FROM NULLIF(p_request_payload->>'data_pagamento', '')
       OR p_row->>'status' NOT IN ('pago', 'pendente')
       OR (p_row->>'status' = 'pago') IS DISTINCT FROM COALESCE((p_request_payload->>'quitado')::BOOLEAN, false)
       OR p_row->>'recorrencia' IS DISTINCT FROM 'Única'
       OR p_row->>'origem_tipo' IS DISTINCT FROM 'assistente_documento'
       OR p_row->>'origem_id' IS DISTINCT FROM p_document_hash
       OR p_row->>'referencia' IS DISTINCT FROM ('ASSIST-' || p_document_hash)
       OR (p_row->>'status' = 'pago' AND NULLIF(p_row->>'data_pagamento', '') IS NULL)
       OR (p_row->>'status' = 'pendente' AND NULLIF(p_row->>'data_pagamento', '') IS NOT NULL)
       OR (p_request_payload->>'tipo_documento' = 'nota_fiscal'
           AND NOT COALESCE((p_request_payload->>'quitado')::BOOLEAN, false)) THEN
      RAISE EXCEPTION 'Linha financeira diverge do documento validado' USING ERRCODE = '22023';
    END IF;
    PERFORM set_config('request.jwt.claims', jsonb_build_object(
      'sub', p_user_id::TEXT, 'email', 'assistente@otovision.local'
    )::TEXT, true);
    INSERT INTO public.obra_transacoes_fluxo (
      user_id, tipo, valor, data, data_vencimento, categoria, descricao, forma_pagamento,
      observacoes, recorrencia, referencia, conta_id, status, data_pagamento, origem_tipo, origem_id
    ) VALUES (
      p_user_id, p_row->>'tipo', (p_row->>'valor')::NUMERIC, (p_row->>'data')::DATE,
      NULLIF(p_row->>'data_vencimento', '')::DATE, p_row->>'categoria', p_row->>'descricao',
      p_row->>'forma_pagamento', p_row->>'observacoes', p_row->>'recorrencia', p_row->>'referencia',
      (p_row->>'conta_id')::UUID, p_row->>'status', NULLIF(p_row->>'data_pagamento', '')::DATE,
      p_row->>'origem_tipo', p_row->>'origem_id'
    ) RETURNING id INTO v_record_id;
  ELSE
    RAISE EXCEPTION 'Tabela de resultado não permitida' USING ERRCODE = '22023';
  END IF;

  v_response := jsonb_build_object(
    'success', true, 'operation_id', v_operation_id, 'table', p_result_table,
    'record_id', v_record_id, 'status', COALESCE(p_row->>'status', 'pendente')
  );
  UPDATE public.obra_assistant_operations
  SET status = 'completed', result_table = p_result_table, result_id = v_record_id,
      response_payload = v_response, completed_at = now()
  WHERE id = v_operation_id;

  RETURN v_response;
END;
$$;

REVOKE ALL ON FUNCTION public.rotate_assistant_delegation(UUID, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_assistant_delegation(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_assistant_context(UUID, UUID, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_assistant_launch(UUID, UUID, TEXT, TEXT, JSONB, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_assistant_delegation(UUID, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_assistant_delegation(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_assistant_context(UUID, UUID, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_assistant_launch(UUID, UUID, TEXT, TEXT, JSONB, TEXT, JSONB) TO service_role;

COMMENT ON TABLE public.obra_assistant_delegations IS
  'Delegações revogáveis para integrações. token_hash é SHA-256; o token puro é exibido somente na ativação.';
COMMENT ON TABLE public.obra_assistant_operations IS
  'Registro imutável de idempotência, origem documental e resultado dos lançamentos feitos pelo assistente.';
