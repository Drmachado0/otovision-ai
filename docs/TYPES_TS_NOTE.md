# Nota sobre src/integrations/supabase/types.ts

## Situação

O arquivo `types.ts` tem **7.521 linhas** e é **gerado automaticamente** pelo Supabase CLI.

## Por que não dividir manualmente?

1. **Auto-gerado**: O arquivo é recriado toda vez que rodamos `supabase gen types typescript`
2. **Sobrescrita**: Qualquer divisão manual seria perdida na próxima geração
3. **Manutenção**: O Supabase mantém o formato como está

## Solução alternativa

Em vez de dividir o arquivo, recomendamos:

1. **Importar apenas o necessário**:
   ```typescript
   // Em vez de importar Database inteiro
   import type { Database } from "@/integrations/supabase/types";

   // Criar tipos específicos por domínio
   type Transacao = Database["public"]["Tables"]["obra_transacoes_fluxo"]["Row"];
   ```

2. **Criar tipos derivados em arquivos separados**:
   ```typescript
   // src/types/transacoes.ts
   import type { Database } from "@/integrations/supabase/types";
   export type Transacao = Database["public"]["Tables"]["obra_transacoes_fluxo"]["Row"];
   export type TransacaoInsert = Database["public"]["Tables"]["obra_transacoes_fluxo"]["Insert"];
   ```

3. **Usar type-only imports** (já é o padrão no projeto)

## Ação

Nenhuma ação necessária. O arquivo grande é uma característica do Supabase, não um problema de código.
