# Guia de Staging Environment

## Situação Atual

O projeto **não tem ambiente de staging** separado. Todas as mudanças vão direto para produção via Lovable.

## Riscos

- Bugs em produção sem teste prévio
- Downtime durante deploys problemáticos
- Dificuldade para testar migrations complexas

## Solução Recomendada

### Opção 1: Supabase Branching (Recomendado)

O Supabase oferece **branches de banco de dados** nativamente:

```bash
# Criar branch de staging
supabase branches create staging

# Aplicar migrations no staging
supabase migration up --linked

# Testar no staging
# URL: https://staging.otovisioncontrole.lovable.app

# Merge para produção quando validado
supabase branches merge staging
```

### Opção 2: Projeto Supabase Separado

Criar um projeto Supabase completamente separado para staging:

1. **Criar projeto**: `otovision-staging`
2. **Configurar variáveis de ambiente**:
   ```
   VITE_SUPABASE_URL=https://staging-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=staging-key
   ```
3. **Deploy na Lovable**: branch `staging` → ambiente de staging

### Opção 3: Preview Deploys (Lovable)

A Lovable oferece preview deploys para cada PR:

- Cada PR gera uma URL única
- Banco de dados compartilhado (cuidado com migrations)
- Ideal para testes de UI, não para dados

## Configuração Recomendada

### 1. Variáveis de Ambiente

```bash
# .env.staging
VITE_SUPABASE_URL=https://staging-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=staging-anon-key
VITE_APP_ENV=staging
```

### 2. CI/CD

```yaml
# .github/workflows/staging.yml
name: Staging

on:
  push:
    branches: [staging]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      # Deploy para staging
```

### 3. Proteção de Produção

```yaml
# .github/workflows/production.yml
name: Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # Requer aprovação manual
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
      - run: npm run build
      # Deploy para produção
```

## Checklist para Implementar Staging

- [ ] Criar projeto Supabase de staging
- [ ] Configurar variáveis de ambiente de staging
- [ ] Configurar branch `staging` no GitHub
- [ ] Configurar deploy automático para staging
- [ ] Configurar proteção de branch `main` (requer aprovação)
- [ ] Documentar processo de promoção staging → produção
- [ ] Treinar equipe no fluxo

## Fluxo de Trabalho Recomendado

```
feature branch → PR → staging (auto) → testes → aprovação → merge main → produção
```

## Contato

Para configurar staging, consultar:
- Supabase Branching: https://supabase.com/docs/guides/platform/branching
- Lovable Environments: https://docs.lovable.app/environments
