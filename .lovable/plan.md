

## Plano: corrigir cálculo de Comissão ao excluir lançamentos

### Diagnóstico
Em `src/pages/ComissaoPage.tsx` o cálculo hoje é:

```
comissaoTotal   = totalGasto * 8%          ← vem de obra_transacoes_fluxo
comissaoPaga    = soma das linhas pago=true
comissaoPendente = comissaoTotal - comissaoPaga
```

Problema: ao excluir um pagamento de comissão (soft delete em `obra_comissao_pagamentos`), o **totalGasto** não muda, então `comissaoTotal` e `comissaoPendente` continuam iguais. A exclusão só some da lista — mas o valor "fantasma" continua aparecendo como pendente.

Além disso, hoje cada Saída em `obra_transacoes_fluxo` gera uma linha em `obra_comissao_pagamentos` automaticamente. Se o usuário excluir a comissão (sem excluir o gasto), ela é regerada na cabeça do cálculo porque o gasto ainda existe.

### O que vou ajustar

1. **Mudar a fórmula em `ComissaoPage.tsx`** para refletir só o que existe na tabela de comissões:
   ```
   comissaoTotal    = soma de TODAS as comissões não excluídas (pago + pendente)
   comissaoPaga     = soma das comissões pago=true
   comissaoPendente = soma das comissões pago=false
   ```
   Assim, ao excluir uma linha, ela some do total e do pendente — comportamento esperado.

2. **Manter "Base (Gastos)"** como referência informativa (continua mostrando `totalGasto`), mas separar visualmente da comissão total. Adicionar um pequeno texto "Comissão teórica (8% sobre gastos): R$ X" para o usuário comparar.

3. **Marcar exclusão como definitiva**: ao soft-deletar uma comissão, gravar `observacoes` com tag `[excluido_manual]` para que o trigger/auto-gerador (caso exista em PagamentoDialog/create_compra_atomica) **não recrie** a mesma comissão na próxima sincronização. Verificarei se há lógica de auto-criação rodando em loop.

4. **Ajustar `InsightsPage.tsx`** que já usa `pago=false` direto da tabela — só conferir que continua coerente com a nova fórmula (já está).

5. **Ajustar `Dashboard.tsx` / `DashboardPage.tsx`** se exibirem "Comissão Pendente" com a fórmula antiga. Vou inspecionar e alinhar.

### Arquivos a editar
- `src/pages/ComissaoPage.tsx` (fórmula principal + UI das KPIs)
- `src/pages/DashboardPage.tsx` (se exibe comissão pendente)
- `src/pages/Dashboard.tsx` (idem)
- `src/components/ComissaoDetailDrawer.tsx` (revisar exclusão para garantir consistência)

### Resultado esperado
- Excluir uma comissão de R$ 100 → "Comissão Total" e "Pendente" caem R$ 100 imediatamente.
- "Base (Gastos)" continua mostrando o total real de saídas como referência.
- Linha "Comissão teórica (8%)" mostra o que seria devido se todos os gastos gerassem comissão — apenas informativo.

