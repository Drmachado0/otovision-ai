## Objetivo

Permitir que cada usuário escolha **hora do backup** (0–23 UTC) e **período de retenção** (dias), e enviar uma cópia adicional dos backups para uma **única conta Google Drive** (do admin do workspace) via conector Lovable.

---

## 1. Banco de dados (nova tabela)

Criar `obra_backup_preferencias` (uma linha por usuário):

- `user_id` (uuid, único, FK lógica para auth.users)
- `hora_utc` (int, 0–23, default 3)
- `retencao_dias` (int, 7–90, default 30)
- `enviar_google_drive` (boolean, default false)
- `ativo` (boolean, default true)

**RLS:** cada usuário vê/edita apenas a própria linha (`auth.uid() = user_id`).

Sem trigger de auditoria nesta tabela (não é dado de obra).

## 2. Edge function `backup-diario-automatico` (refatorar)

Trocar a regra de execução:

- Cron passa a rodar **toda hora cheia** (`0 * * * *`).
- Ler `current_hour_utc = EXTRACT(HOUR FROM now())`.
- Buscar usuários em `obra_backup_preferencias` com `ativo=true AND hora_utc = current_hour_utc`. Fallback: usuários **sem** preferência usam hora padrão **3 UTC**.
- Para cada usuário elegível:
  1. Exportar tabelas `obra_*` (igual hoje).
  2. Subir JSON em `backups-automaticos/{user_id}/{data}.json`.
  3. **Retenção por usuário**: ler `retencao_dias` (default 30) e deletar arquivos mais antigos que esse limite (em vez do constante `RETENTION_DAYS = 30`).
  4. Se `enviar_google_drive = true`, fazer upload multipart para a pasta central no Google Drive (ver §3).

## 3. Integração com Google Drive (1 Drive central)

- Conectar o conector **Google Drive** ao projeto via `standard_connectors--connect("google_drive")`.
- Na primeira execução com Drive habilitado, garantir/criar a pasta raiz `OTOVISION-Backups` e, dentro dela, uma subpasta por `user_id` (cachear o `folderId` numa tabela auxiliar `obra_backup_drive_folders` com `user_id` único + `folder_id`).
- Upload via gateway: `POST https://connector-gateway.lovable.dev/google_drive/upload/drive/v3/files?uploadType=multipart` com headers `Authorization: Bearer ${LOVABLE_API_KEY}` e `X-Connection-Api-Key: ${GOOGLE_DRIVE_API_KEY}`.
- Falha no Drive **não aborta** o backup do Storage; só registra erro no resultado.

## 4. Cron (re-agendar)

Atualizar o agendamento `backup-diario-automatico` no `pg_cron`:

- Desagendar o cron atual (`cron.unschedule('backup-diario-automatico')`).
- Re-agendar com expressão `0 * * * *`.

## 5. UI em Configurações → Backup de Dados

Acima da lista de backups automáticos, adicionar um card "Preferências de backup automático":

- Select "Hora do backup (UTC)" — 00 a 23.
- Select "Reter por" — 7 / 14 / 30 / 60 / 90 dias.
- Switch "Enviar cópia para o Google Drive".
- Botão "Salvar preferências".
- Texto de ajuda mostrando próximo horário de execução em UTC e equivalente local.

Carrega/grava em `obra_backup_preferencias` (upsert por `user_id`).

Se o switch do Drive estiver ON e a conexão **não existir**, mostrar aviso "O admin precisa conectar o Google Drive em Configurações" e desabilitar o switch.

## 6. Validação pós-implementação

- Confirmar que `select * from cron.job` mostra apenas a entrada `0 * * * *`.
- Disparar a edge function manualmente via `curl_edge_functions` para validar fluxo (com e sem Drive).
- Verificar que a UI persiste e recupera as preferências.
- Verificar que a retenção por usuário remove apenas arquivos do próprio usuário.

## Detalhes técnicos

- Usuários sem linha em `obra_backup_preferencias` continuam sendo backupeados às 03:00 UTC com retenção de 30 dias (compatibilidade).
- O bucket `backups-automaticos` permanece privado; políticas RLS já limitam SELECT por pasta=user_id.
- O upload Drive é melhor-esforço — erros vão para o objeto `results[user_id].drive_error` no JSON de retorno.
- Como o Drive é único, **todos os usuários compartilham a mesma conta Google**. A subpasta `{user_id}` separa visualmente, mas qualquer pessoa com acesso àquele Drive vê todos os backups. Documentar isso na ajuda do switch.
