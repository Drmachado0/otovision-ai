

## Plano: permitir editar o Vencimento na Transação

### Diagnóstico
No `TransacaoDetailDrawer.tsx` o campo **Vencimento** aparece como texto fixo (read-only), igual mostrado no print. Mesmo entrando em modo de edição, só Data, Categoria, Forma de Pagamento e Observações são editáveis. Por isso não dá pra ajustar a data de vencimento de uma Saída pendente (ex.: Boleto da INVIOLAVEL).

### O que vou fazer
1. Em `src/components/TransacaoDetailDrawer.tsx`:
   - Adicionar `data_vencimento` ao estado de edição.
   - Quando `tipo === "Saída"` e em modo edição, renderizar um `<input type="date">` no lugar do texto.
   - Incluir `data_vencimento` no `update` enviado ao Supabase.
2. Manter exibição read-only (formatada) quando não estiver editando.
3. Validar: vencimento opcional para Entrada, permitido para Saída.

### Arquivo a editar
- `src/components/TransacaoDetailDrawer.tsx`

### Resultado esperado
Ao abrir uma transação e clicar em Editar, o campo **Vencimento** vira um seletor de data; salvar atualiza `data_vencimento` na tabela `obra_transacoes_fluxo` e reflete nas telas de Contas a Pagar / Fluxo.

