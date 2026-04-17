

## Plano: adicionar forma de pagamento no Leitor IA

### Diagnóstico
Hoje em `LeitorIAPage.tsx`, após a IA extrair os dados, o usuário só edita: Fornecedor, Valor, Data, Tipo, Categoria, Descrição. Ao clicar em **Salvar**, é gravado direto em `obra_transacoes_fluxo` com `forma_pagamento: ""`, `recorrencia: "Única"`, `conta_id: ""` — sem opção de definir parcelamento, vencimento ou conta. Por isso depois cai em Contas a Pagar sem dados corretos e não dá pra editar.

A tela de **Nova Transação** (Fluxo de Caixa, imagem 4) já tem o fluxo certo: Tipo de Lançamento (Única / Parcelada / Recorrente), Vencimento, Forma de Pagamento, Conta.

### O que vou fazer

1. **Expandir o painel "Dados Extraídos"** no `LeitorIAPage.tsx` adicionando, após Descrição, os mesmos campos da Nova Transação:
   - **Tipo de Lançamento**: Única / Parcelada / Recorrente (botões iguais ao Fluxo)
   - **Data de Vencimento** (data input)
   - Se **Parcelada**: campo "Número de parcelas" + "Intervalo (dias)"
   - Se **Recorrente**: seletor de frequência (Mensal, Semanal, etc.)
   - **Forma de Pagamento**: PIX, Boleto, Cartão, Dinheiro, Transferência
   - **Conta**: select com `obra_contas_financeiras` ativas

2. **Pré-preencher** vencimento = data do documento (ou hoje), forma = PIX (padrão).

3. **Refatorar `salvarTransacao`** para:
   - Caso **Única**: insere 1 linha em `obra_transacoes_fluxo` com `forma_pagamento`, `conta_id`, `data_vencimento` corretos.
   - Caso **Parcelada**: gera N linhas (uma por parcela) com vencimentos espaçados, descrição "X/N", valor dividido. Usa o mesmo padrão já existente no `PagamentoDialog`/Fluxo.
   - Caso **Recorrente**: insere com `recorrencia` definida + `data_vencimento`, deixando o `recurrenceEngine` cuidar das próximas.

4. **Reaproveitar lógica** consultando como `FluxoCaixaPage.tsx` faz hoje pra parcelamento/recorrência, garantindo consistência (mesma estrutura de payload).

5. **Validação**: bloquear Salvar se faltar Conta, Forma de Pagamento ou Vencimento.

### Arquivos a editar
- `src/pages/LeitorIAPage.tsx` (única alteração principal)
- Possivelmente extrair um helper `src/lib/lancamentoBuilder.ts` se a lógica de parcelas/recorrência ainda não estiver isolada — verificarei `FluxoCaixaPage.tsx` antes de duplicar código.

### Resultado esperado
Após processar pela IA, o usuário define **na mesma tela** se é à vista, parcelada (com nº parcelas) ou recorrente, escolhe forma e conta, e clica Salvar. Os lançamentos vão pra `obra_transacoes_fluxo` já estruturados, aparecendo corretamente em **Contas a Pagar** com vencimento, parcela e forma — sem precisar editar depois.

