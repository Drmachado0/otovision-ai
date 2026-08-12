# OTOVISION — Controle de Obras

Aplicação web de gestão financeira e operacional de obras.

## URLs oficiais

- Aplicação pública: https://otovisionocontrole.lovable.app
- Repositório: https://github.com/Drmachado0/otovision-ai
- Endpoint delegado de lançamentos: `https://ebyruchdswmkuynthiqi.supabase.co/functions/v1/assistente-lancamentos`

O endpoint delegado só fica disponível após aplicar a migration correspondente e implantar a Edge Function. Consulte [`docs/assistant-launch-access.md`](docs/assistant-launch-access.md) para arquitetura, ativação, segurança e testes de fumaça.

## Desenvolvimento local

```sh
npm ci
npm run dev
```

## Verificações

```sh
npm test
npx tsc --noEmit
npm run lint
npm run build
```

## Supabase

O projeto usa Supabase para autenticação, PostgreSQL/RLS, Storage, Realtime e Edge Functions. Mudanças de banco e funções devem ser validadas primeiro em staging; não aplique migrations diretamente em produção sem backup, revisão e plano de rollback.
