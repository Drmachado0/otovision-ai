## Problema

A tela **Contas a Pagar** e seus KPIs leem apenas `obra_transacoes_fluxo` (status `pendente`). Compras parceladas guardam suas parcelas em `obra_compras.parcelas` (JSONB) e só geram lançamento no fluxo quando o usuário clica em "Pagar". Portanto, parcelas futuras de compras parceladas **não aparecem** em Contas a Pagar nem somam nos KPIs (Total Pendente, Vencidas, Vencem Hoje, 7 dias).

O Dashboard tem o mesmo gap no KPI "Contas a Pagar", embora o card "Compras" já trate parcelas via `calcularResumoCompras`.

## Objetivo

Unificar a visão: Contas a Pagar deve listar **todos os compromissos a pagar**, incluindo parcelas pendentes de `obra_compras`, sem alterar regras de negócio (continua sem duplicar com o fluxo).

## Mudanças

### 1. `src/pages/ContasAPagarPage.tsx`
- Buscar em paralelo `obra_compras` (não deletadas, status_entrega ≠ Cancelado) com `id, fornecedor, descricao, categoria, conta_id, parcelas, numero_parcelas, valor_total, data, status_entrega`.
- Para cada compra com `parcelas` JSONB, achatar em "linhas virtuais" do tipo `ContaPagar`:
  - Apenas parcelas com `status === "Pendente"`.
  - `id` virtual: `compra:<compra_id>:<numero>`.
  - Campos: `descricao = compra.descricao + " (parcela N/T)"`, `valor`, `data_vencimento`, `parcela_numero`, `parcela_total`, `categoria`, `conta_id`, `tipo = "Saída"`, `status = "pendente"`, marca interna `origem = "compra-parcela"`.
- Mesclar com lançamentos do fluxo, ordenar por `data_vencimento` ASC, aplicar **filtros e busca em memória** sobre o array combinado (search, vencimento hoje/vencidas/7 dias, categoria) e paginar client-side.
- KPIs (Total Pendente, Vencidas, Vencem Hoje, 7 dias) recalculados sobre o array combinado.

### 2. Ação "Pagar" para parcela de compra
- Quando a linha for de origem `compra-parcela`, abrir um diálogo de pagamento que chame a RPC existente `pagar_parcela_atomica(p_compra_id, p_numero_parcela, p_transacao)`.
- Reutilizar `ConfirmarPagamentoDialog` adaptando o submit: se `origem === "compra-parcela"`, usar a RPC; caso contrário, manter fluxo atual.
- "Cancelar" para parcela de compra: marca aquela parcela como `Cancelada` dentro do JSONB (update na compra). Pode ficar como follow-up se quiser manter o escopo enxuto — sinalizar no plano.

### 3. KPI "Contas a Pagar" do Dashboard (`src/pages/DashboardPage.tsx`)
- Somar ao total atual o valor de parcelas pendentes vindas de `obra_compras` (mesma lógica do passo 1) para refletir o real a pagar e bater com a tela.

### 4. Sem migrações
- Nenhuma alteração de schema. Toda a lógica é client-side, reaproveitando `pagar_parcela_atomica` e `obra_compras.parcelas`.

## Considerações técnicas

- **Sem duplicação:** ao pagar uma parcela, a RPC já marca `status = "Paga"` no JSONB e cria a transação no fluxo. O filtro `status === "Pendente"` evita contar duas vezes.
- **Performance:** com poucas centenas de compras, achatar no client é trivial; paginação passa a ser client-side (50 itens/página). Se o volume crescer muito, migrar para uma view SQL `obra_contas_a_pagar_view` no futuro.
- **Realtime:** assinar também `obra_compras` além de `obra_transacoes_fluxo` para refresh automático.

## Fora de escopo

- Criar view SQL unificada (pode vir depois se houver volume).
- Permitir editar/cancelar parcela individualmente fora do fluxo de pagamento (se desejado, abrir tarefa separada).
