

# OTOVISION — Plataforma de Gestão de Obra

## Visão Geral
Construir toda a interface web do OTOVISION sobre o banco de dados Supabase já existente (66 tabelas `obra_*`). Dark mode premium, responsivo, estilo SaaS moderno.

## Fase 1 — Estrutura Base & Dashboard
1. **Layout principal**: Sidebar com navegação (Dashboard, Fluxo de Caixa, Compras, Documentos IA, Cronograma, Comissões, Conciliação, Auditoria, Configurações), header com user info, dark mode por padrão
2. **Autenticação**: Login/signup com Supabase Auth (já tem `handle_new_user` trigger)
3. **Dashboard**: Cards resumo (orçamento total, gasto, saldo, % executado) puxando de `obra_config` + `obra_transacoes_fluxo`. Gráficos de gastos por categoria e evolução mensal

## Fase 2 — Fluxo de Caixa & Compras
4. **Fluxo de Caixa**: CRUD completo de transações (`obra_transacoes_fluxo`), filtros por data/categoria/origem, soft delete com `deleted_at`, contas financeiras (`obra_contas_financeiras`)
5. **Compras**: CRUD compras (`obra_compras`), geração automática de transação ao salvar (usa `create_compra_atomica` RPC existente), vínculo com fornecedores e NFs

## Fase 3 — IA & Documentos
6. **Upload de documentos**: Upload PDF/imagem/CSV para Storage, registro em `obra_documentos_processados`
7. **Edge Function IA**: Criar edge function que envia documento para Lovable AI Gateway, extrai dados (data, valor, descrição, fornecedor), retorna para revisão
8. **Tela de revisão**: Exibir dados extraídos pela IA, permitir edição antes de salvar como transação/compra
9. **Pasta automática**: Interface para gerenciar status dos documentos (pendente → processado → revisão → erro)

## Fase 4 — Deduplicação & Comissões
10. **Deduplicação**: Exibir `duplicidade_status` e `duplicidade_score` dos documentos, comparação visual lado a lado
11. **Comissões**: CRUD `obra_comissao_pagamentos`, cálculo % sobre saídas, status pendente/pago, filtros por mês

## Fase 5 — Etapas, Conciliação & Auditoria
12. **Cronograma/Etapas**: CRUD `obra_cronograma`, visualização Gantt simplificada, vínculo com transações, progresso visual
13. **Conciliação bancária**: Upload de extrato, comparação com transações existentes (`obra_conciliacoes_bancarias`), score de compatibilidade, revisão manual
14. **Auditoria**: Visualização do `obra_audit_log`, filtros por tabela/ação/usuário/período

## Fase 6 — Realtime & Polish
15. **Supabase Realtime**: Subscriptions nas tabelas principais para atualização automática
16. **Notificações**: Sistema usando `obra_notificacoes` com badge e dropdown
17. **Configurações**: Tela para editar `obra_config` (nome da obra, orçamento, categorias)

## Design
- Dark mode como padrão (CSS variables já configuradas)
- Paleta escura premium com acentos em verde/azul
- Cards com glassmorphism sutil, transições suaves
- Tabelas com paginação e busca inline
- Responsivo mobile-first

## Tecnologia
- React + Tailwind + shadcn/ui (já instalado)
- Supabase client existente
- Lovable AI Gateway para extração de documentos (via edge function)
- Recharts para gráficos do dashboard

