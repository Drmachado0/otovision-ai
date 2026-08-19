# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Added
- Estrutura de testes E2E com Playwright
- Guia de rollback de migrations
- Documentação sobre types.ts auto-gerado

### Changed
- Lazy loading de recharts em ResumoMensalPage
- React.memo em componentes simples (ConfirmDialog, ErrorBoundary, NavLink)

### Fixed
- KPI "Total Pendente" em Contas a Pagar (somava valor_total de todas as compras)
- CORS restrito em 7 Edge Functions
- Vulnerabilidades react-router-dom 6.30.1 → 7.18.2

### Security
- `.env` removido do rastreamento git
- npm audit: 0 vulnerabilidades

## [0.1.0] - 2026-08-19

### Added
- Sistema de lançamentos delegados via assistente (NFS-e, comprovantes)
- Conta SICREDI cadastrada
- Comissão 8% automática

### Fixed
- Duplicatas de recorrência (índice único + verificação prévia)
- 18 lançamentos duplicados removidos
- Status "Pago" normalizado para "pago"
- Data de pagamento JMC parcela 2/2 corrigida

---

## Como usar

### Adicionar nova entrada

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- Nova funcionalidade

### Changed
- Mudança em funcionalidade existente

### Deprecated
- Funcionalidade que será removida

### Removed
- Funcionalidade removida

### Fixed
- Correção de bug

### Security
- Correção de vulnerabilidade
```

### Versionamento

- **MAJOR** (X.0.0): Mudanças incompatíveis com versões anteriores
- **MINOR** (0.X.0): Novas funcionalidades compatíveis
- **PATCH** (0.0.X): Correções de bugs compatíveis
