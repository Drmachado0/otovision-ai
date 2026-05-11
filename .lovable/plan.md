## Objetivo
Remover completamente os módulos **Cronograma**, **Diário de Obra** e **Conciliação Bancária** da aplicação, sem quebrar as demais funcionalidades.

## Escopo das remoções

### 1. Páginas (deletar arquivos)
- `src/pages/CronogramaPage.tsx`
- `src/pages/DiarioObraPage.tsx`
- `src/pages/ConciliacaoPage.tsx`
- `src/hooks/useConciliacao.ts`
- `src/test/conciliacao.test.ts`

### 2. Roteamento e navegação
- `src/App.tsx`: remover imports lazy e `<Route>` de `/cronograma`, `/diario`, `/conciliacao`.
- `src/components/AppSidebar.tsx`: remover itens "Cronograma" e "Conciliação".
- `src/components/AppLayout.tsx`: remover itens `/cronograma`, `/diario`, `/conciliacao`.

### 3. Telas que consultam `obra_cronograma` — limpar referências
- `src/pages/DashboardPage.tsx`: remover query `obra_cronograma`, KPIs/cards/links de cronograma e o `useRealtimeSubscription("obra_cronograma", ...)`.
- `src/pages/InsightsPage.tsx`: remover query e realtime de `obra_cronograma`; ajustar gráficos/cards que dependiam dela.
- `src/pages/PrevisaoPage.tsx`: remover query e realtime de `obra_cronograma`; ajustar projeções (manter projeção via fluxo/compras).
- `src/pages/RelatoriosPage.tsx`: remover seção/coluna do relatório de cronograma.
- `src/hooks/useAutoNotifications.ts`: remover regra "Etapas atrasadas do cronograma" (item 5) e o link `/cronograma`.

### 4. Medição de Obra (`src/pages/MedicaoObraPage.tsx`)
Hoje carrega etapas de `obra_cronograma`. Como o cronograma será removido, a tela perde sentido — proponho **remover também a página de Medição** (rota `/medicao`, link na sidebar/layout). Confirmar na implementação.

### 5. Componentes auxiliares
- `src/components/OrigemBadge.tsx`: remover o `case "conciliacao"` (não aparecerá mais como origem de transação).

### 6. Backend (Supabase)
Tabelas envolvidas: `obra_cronograma`, `obra_diario`, `obra_conciliacoes_bancarias`, `obra_sugestoes_conciliacao`, `obra_eventos_conciliacao`, `obra_movimentacoes_extraidas`.

Edge functions a revisar:
- `supabase/functions/exportar-backup/index.ts`
- `supabase/functions/importar-backup/index.ts`
- `supabase/functions/limpar-dados-obra/index.ts`

**Estratégia recomendada:** apenas remover as tabelas das listas `ALLOWED_TABLES` das edge functions e parar de consultá-las no frontend. **Não** dropar as tabelas no banco — preserva dados históricos e evita risco em triggers de auditoria (`obra_audit_log`). Caso prefira dropar de fato, criamos uma migration.

## Validações pós-mudança
- Rodar `tsc`/build para confirmar zero referências quebradas.
- Verificar que Dashboard, Insights, Previsão, Relatórios e Notificações renderizam sem cronograma.
- Verificar sidebar/menu mobile sem itens removidos.

## Pergunta antes de implementar
1. **Medição de Obra** depende de Cronograma — devo remover também?
2. **Tabelas no banco** — manter (mais seguro) ou dropar via migration?
