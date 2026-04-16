

# Fix: Transações Não Descontam no Saldo + Build Errors

## Diagnóstico

O arquivo `src/integrations/supabase/types.ts` está **desatualizado** — faltam 6 colunas que existem no banco:
- `status` (default: 'pendente')
- `data_vencimento` (date, nullable)
- `data_pagamento` (timestamp, nullable)
- `comprovante_path` (text, nullable)
- `parcela_numero` (integer, nullable)
- `parcela_total` (integer, nullable)

Isso causa **todos** os build errors listados: queries com `.eq("status", ...)` e `.select("data_vencimento, ...")` falham na compilação TypeScript. Como o build falha, as queries não executam, e o saldo nunca é calculado corretamente.

## Solução

Como não podemos editar `types.ts` diretamente, a solução é usar **type assertion (`as any`)** em todas as queries que referenciam essas colunas.

### Arquivos a corrigir (8 arquivos):

1. **`src/pages/DashboardPage.tsx`** — Cast queries com `status` e `data_vencimento` usando `as any`
2. **`src/pages/FluxoCaixaPage.tsx`** — Cast query com `status` e `data_vencimento`
3. **`src/pages/ContasAPagarPage.tsx`** — Cast queries com `status`, `data_vencimento`; fix `ContaPagar` type (`data_vencimento: string | null | undefined`)
4. **`src/pages/ContasBancariasPage.tsx`** — Cast query com `status`
5. **`src/components/ConfirmarPagamentoDialog.tsx`** — Cast `.update(updateData)` com `as any`
6. **`src/components/TransacaoDetailDrawer.tsx`** — Fix `conta_id` null vs undefined: use `(form.conta_id ?? "") as any`
7. **`src/lib/recurrenceEngine.ts`** — Cast `mothers` e `latest` queries; fix `data_vencimento` access

### Padrão de fix

Para cada query que usa colunas ausentes nos types:
```typescript
// Antes (erro TS):
.eq("status", "pago")

// Depois:
.eq("status" as any, "pago")
```

Para selects:
```typescript
// Cast o resultado:
const rows = data as unknown as MyLocalType[];
```

Para inserts/updates com campos extras:
```typescript
.update({ status: "pago", ... } as any)
```

### Resultado esperado
- Build compila sem erros
- Queries executam corretamente no runtime
- Dashboard calcula saldo = orçamento - gastos pagos
- ContasBancarias mostra saldo = saldo_inicial + entradas - saídas (somente status="pago")

