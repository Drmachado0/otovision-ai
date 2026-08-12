# Runbook — correções críticas antes do deploy

Este PR remove valores sensíveis do conteúdo alcançável da branch e passa a buscar os valores do cron no Supabase Vault. Isso **não apaga o segredo do histórico Git** e **não o rotaciona no projeto remoto**.

## Ações manuais obrigatórias

1. Gere um novo valor aleatório para `BACKUP_CRON_SECRET`.
2. Atualize o secret da Edge Function:
   ```bash
   supabase secrets set BACKUP_CRON_SECRET='<novo-valor>' --project-ref ebyruchdswmkuynthiqi
   ```
3. Atualize/crie no Vault os secrets `backup_cron_secret` e `supabase_anon_key`.
4. Aplique as migrations em staging antes de produção.
5. Faça o redeploy de `importar-backup`.
6. Confirme que o job `backup-diario-automatico` usa valores do Vault e retorna HTTP 2xx.
7. Teste com contas dos quatro perfis:
   - `admin`: lança, paga, reabre folha e restaura backup;
   - `financeiro`: lança e paga; não reabre nem restaura;
   - `construtor` e `visualizador`: não executam as RPCs financeiras.
8. Teste restauração em staging com relações entre tabelas e verifique rollback completo diante de um ID conflitante.
9. Avalie a limpeza do segredo antigo do histórico com `git filter-repo` ou BFG. Isso reescreve o histórico e deve ser coordenado com todos os colaboradores.

## Decisão de produto aplicada

Novos cadastros recebem `financeiro`, que é o perfil mínimo atualmente capaz de concluir o onboarding e operar uma obra sem receber administração ou exclusão. Contas existentes sem papel também recebem esse perfil. Se o cadastro público não deve permitir escrita financeira, substitua o autosserviço por convite/aprovação antes do lançamento.

## Observações sobre restauração

- Somente `admin` pode restaurar.
- A Edge Function usa o JWT do chamador, nunca `service_role`.
- A restauração preserva IDs e é atômica no banco.
- `obra_audit_log` não é importada; os eventos são gerados por triggers.
- Arquivos do Supabase Storage ainda exigem uma fase própria de backup/restauração.
