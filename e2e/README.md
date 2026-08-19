# Testes E2E com Playwright

## Pré-requisitos

```bash
# Instalar browsers (apenas na primeira vez)
npx playwright install chromium

# Ou instalar todos
npx playwright install
```

## Rodar testes

```bash
# Headless (CI)
npm run test:e2e

# Com UI (desenvolvimento)
npm run test:e2e:ui

# Debug
npx playwright test --debug
```

## Estrutura

- `e2e/smoke.spec.ts` - Testes básicos de smoke
- `playwright.config.ts` - Configuração do Playwright

## CI

Os testes E2E rodam automaticamente no CI quando configurado.
