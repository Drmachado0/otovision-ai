## Plano: Comissão 2.0 — Controle total mês a mês

Reformula `src/pages/ComissaoPage.tsx` para virar um painel completo de controle da comissão, com KPIs reorganizados, série temporal mês a mês, gráficos de acompanhamento e tabela auditável de TODOS os lançamentos. Mantém o drawer de detalhe e exclusão já existentes.

### 1. KPIs no topo (linha 1 — visão geral)
Reorganizar em 4 cards principais (mais legíveis que os 6 atuais empilhados):

| Card | Conteúdo | Cor |
|---|---|---|
| Comissão Total Acumulada | soma de todos lançamentos + sub-linha "8% sobre R$ X de gastos" | primary |
| Pago | total + nº de lançamentos pagos + % do total | success |
| Pendente | total + nº pendentes + alerta se > 30 dias | warning |
| Este Mês | comissão do mês atual + comparação com mês anterior (▲/▼ %) | info |

### 2. Linha 2 — KPIs secundários (compactos)
Strip horizontal: Média Mensal · Mês Maior · Mês Menor · Ticket Médio por Lançamento · Previsão Próx. Mês (média móvel 3m).

### 3. Gráficos de acompanhamento (recharts, já no projeto)

**Gráfico A — Comissão mês a mês (ComposedChart)**
- Eixo X: meses (ordenados cronologicamente, formatados "Abr/26")
- Barras empilhadas: Pago (verde) + Pendente (laranja)
- Linha: Comissão teórica do mês (8% dos gastos do mês) — referência
- Tooltip: valores formatados em BRL + nº de lançamentos

**Gráfico B — Evolução acumulada (AreaChart)**
- Duas áreas: Acumulado Pago vs Acumulado Total
- Mostra a curva de quitação ao longo do tempo
- Identifica visualmente o "gap" pendente acumulado

**Gráfico C — Distribuição por status (donut pequeno) + Top 5 fornecedores (barras horizontais)**
- Lado a lado, em grid 2 colunas
- Donut: Pago vs Pendente (% e valor)
- Top fornecedores: maiores geradores de comissão

### 4. Tabela mensal resumida (nova)
Card "Resumo Mensal" — uma linha por mês, ordenado do mais recente:

| Mês | Lançamentos | Pago | Pendente | Total | % Quitado | Ações |
|---|---|---|---|---|---|---|
| Abril/26 | 12 | R$ 2.000 | R$ 6.094 | R$ 8.094 | 24% | [▼ expandir] |

Clicar em "expandir" abre os lançamentos daquele mês inline (accordion) — facilita auditar mês fechado.

### 5. Detalhamento de Pagamentos (lista atual, melhorada)
Mantém a lista atual mas com:
- **Filtros expandidos**: Status (todos/pago/pendente) + Mês (dropdown) + Fornecedor (search) + Origem (NF/Orçamento/Compra/Manual) + ordenação (data ↓/↑, valor ↓/↑)
- **Busca textual** por descrição/fornecedor
- **Ação em massa**: checkbox por linha + botão "Marcar X como pagas" (atualiza várias de uma vez)
- **Badge de "atrasado"** em pendentes com mês de referência > 30 dias
- Drawer de detalhe e exclusão continuam funcionando como hoje

### 6. Exportação
Botão "Exportar CSV" no header da página → baixa todos os lançamentos filtrados (mês, fornecedor, valor base, comissão, status, origem). Útil para conferência externa.

### Lógica de agregação (técnica)
Construir `porMes: Record<string, { pago, pendente, total, count, gastosMes }>` num único `useMemo` a partir de `comissoes` + `transacoes`. Ordenação cronológica via `Object.keys().sort()`. Mês corrente determinado por `todayLocalISO().slice(0,7)`.

A "comissão teórica do mês" usa `obra_transacoes_fluxo` agrupado por `to_char(data,'YYYY-MM')` × 8% — já temos `transRes` carregado, basta agregar por mês.

Acumulados gerados com `reduce` cumulativo sobre o array ordenado.

### Arquivos a editar
- `src/pages/ComissaoPage.tsx` — reescrita do layout, agregações e gráficos (único arquivo principal)
- Reuso de: `ComissaoDetailDrawer`, `ConfirmDialog`, `formatCurrency`, `formatMes`, recharts, Progress
- Sem mudanças em DB, hooks ou drawer

### Resultado
Painel de Comissão completo: você bate o olho e vê quanto deve, quanto pagou, evolução mês a mês em gráfico, qual mês tem mais pendência, pode filtrar/buscar/exportar e confirmar pagamentos em lote. Sem perder nenhum lançamento.