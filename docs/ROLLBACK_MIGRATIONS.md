# Guia de Rollback de Migrations

## Situação Atual

O projeto tem **46 migrations** no diretório `supabase/migrations/`, todas **forward-only** (sem rollback automático).

## Por que não há rollback automático?

O Supabase CLI não suporta rollback automático de migrations. Cada migration é aplicada sequencialmente e não há mecanismo nativo para reverter.

## Estratégias de Rollback

### 1. Rollback Manual (Recomendado)

Para cada migration crítica, crie uma migration de rollback correspondente:

```sql
-- Migration: 20260819000000_rollback_prevent_recurrence_duplicates.sql
-- Rollback de: 20260818235959_prevent_recurrence_duplicates.sql

DROP INDEX IF EXISTS idx_obra_transacoes_recorrencia_unica;
DROP INDEX IF EXISTS idx_obra_transacoes_recorrencia_grupo;
```

### 2. Backup antes de Migration

Antes de aplicar migrations em produção:

```bash
# Backup do banco
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql

# Aplicar migration
supabase migration up

# Se algo der errado, restaurar
supabase db reset --linked
# ou
psql $DATABASE_URL < backup_20260819_020000.sql
```

### 3. Migration de Correção

Se uma migration causar problemas, crie uma nova migration para corrigir:

```sql
-- Migration: 20260819000000_fix_recurrence_duplicates_issue.sql
-- Corrige problema causado pela migration anterior

-- Exemplo: remover constraint que causou erro
ALTER TABLE public.obra_transacoes_fluxo
DROP CONSTRAINT IF EXISTS ...;
```

## Migrations Críticas (com rollback recomendado)

| Migration | Risco | Rollback Necessário |
|-----------|-------|---------------------|
| `20260818235959_prevent_recurrence_duplicates.sql` | Médio | ✅ Sim |
| `20260812200000_validate_paid_canonical_payment.sql` | Alto | ✅ Sim |
| `20260812190000_finalize_existing_canonical_payment.sql` | Alto | ✅ Sim |
| `20260812180000_fix_payroll_status_enum_runtime.sql` | Médio | ⚠️ Opcional |
| `20260812170000_harden_purchase_payment_runtime.sql` | Alto | ✅ Sim |

## Como criar rollback para migrations existentes

### Exemplo: prevent_recurrence_duplicates

```sql
-- Rollback: 20260819000000_rollback_prevent_recurrence_duplicates.sql

-- 1) Remover índice único
DROP INDEX IF EXISTS idx_obra_transacoes_recorrencia_unica;

-- 2) Remover índice de performance
DROP INDEX IF EXISTS idx_obra_transacoes_recorrencia_grupo;

-- 3) Verificar se há dados duplicados que precisam ser limpos
-- (opcional, se necessário)
```

## Procedimento de Emergência

Se uma migration quebrar produção:

1. **Não entre em pânico** — avalie o impacto
2. **Verifique os logs** — Supabase Dashboard > Logs
3. **Restaure o backup** — se disponível
4. **Crie migration de correção** — não delete a problemática
5. **Documente o incidente** — para referência futura

## Contato

Em caso de dúvidas sobre migrations, consultar:
- Documentação Supabase: https://supabase.com/docs/guides/database/migrations
- Time de desenvolvimento
