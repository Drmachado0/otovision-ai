## Objetivo

No `Contas a Pagar`, o KPI **Total Pendente** deve refletir o **valor total das compras** (soma de todas as parcelas, pagas + pendentes) em vez de somar apenas as parcelas pendentes. Os demais KPIs (Vencidas, Vencem Hoje, Próximos 7 dias) e a listagem continuam baseados em parcelas/lançamentos pendentes — só o "Total Pendente" muda de semântica para "Total Compromissado".

## Mudanças

### `src/pages/ContasAPagarPage.tsx`

1. **Buscar `valor_total` e `numero_parcelas`** em `obra_compras` (já lemos a tabela; basta acrescentar os campos no `select`).
2. **Guardar as compras brutas** num estado paralelo (`comprasRaw`) além das linhas achatadas, para poder somar `valor_total` por compra ativa.
3. **Recalcular o KPI "Total Pendente"** como:
   - soma de `valor` dos lançamentos do fluxo pendentes (`obra_transacoes_fluxo`)
   - + soma de `valor_total` de todas as compras ativas (não canceladas), independentemente de parcelas pagas.
4. **Subtítulo do card** muda de `N lançamento(s)` para algo como `X lançamentos + Y compras` para deixar claro o que entrou no número.
5. **Rótulo opcional**: manter "Total Pendente" (o usuário escolheu essa semântica) mas adicionar tooltip curta explicando "inclui valor total das compras parceladas, mesmo parcelas já pagas".

### Fora de escopo

- Vencidas / Vencem Hoje / Próximos 7 dias continuam considerando apenas parcelas/lançamentos pendentes com vencimento (não faz sentido somar parcelas pagas em vencidas).
- Lista da tabela continua mostrando uma linha por parcela pendente (sem duplicar com o fluxo).
- Sem migrações; só leitura adicional de colunas já existentes.

## Detalhes técnicos

- Acrescentar `valor_total, numero_parcelas` ao `select` de `obra_compras`.
- Novo `useMemo` `kpis` passa a depender de `comprasRaw` também.
- Tipo `CompraComParcelas` em `src/lib/contasAPagarParcelas.ts` já é compatível; basta o componente guardar o array original retornado.
