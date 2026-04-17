

## Plano: Dashboard clicável + rename + atalho Leitor IA

### 1. KPIs principais viram links
Em `DashboardPage.tsx`, transformar `StatCard` para aceitar prop opcional `to` (rota). Quando presente, envolve o card em `<Link>` com hover. Mapeamento:

| Card | Rota |
|---|---|
| Orçamento Total | `/configuracoes` (onde edita o orçamento) |
| Total Gasto | `/fluxo` |
| **Saldo do Orçamento** (renomeado) | `/previsao` |
| Total Entradas | `/fluxo` |

### 2. Rename
"Saldo Restante" → **"Saldo do Orçamento"** (linha 255 do array de KPIs).

### 3. MiniKPIs também clicáveis
Adicionar `to` opcional em `MiniKPI` também:
- Custo/m² → `/relatorios`
- Burn Rate → `/previsao`
- Projeção Final → `/previsao`
- Risco → `/insights`

### 4. Atalho "Leitor IA" no Dashboard
Adicionar um card de ação destacado logo abaixo do header (antes dos KPIs ou junto da linha de Compras/Comissões/Contas), com ícone Sparkles + texto "Leitor IA — Envie nota fiscal, recibo ou extrato" → link pra `/leitor-ia`. Estilo: `glass-card` com borda primary, hover sutil. Não duplica a página, só atalho rápido.

### Arquivo a editar
- `src/pages/DashboardPage.tsx` (único arquivo)

### Resultado
Todos os cards do topo do dashboard ficam clicáveis e levam ao detalhe correspondente, "Saldo Restante" passa a se chamar "Saldo do Orçamento", e há um atalho proeminente pro Leitor IA logo no dashboard.

