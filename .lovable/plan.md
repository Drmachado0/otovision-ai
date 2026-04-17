

## Plano: Backup automático no Google Drive (Service Account + Cron)

### Arquitetura
```text
pg_cron (diário 03h) 
   → net.http_post 
   → edge function `backup-para-drive`
       1. busca dados de todas as tabelas obra_* 
       2. autentica no Google via Service Account (JWT → access_token)
       3. faz upload multipart pra pasta do Drive
       4. apaga backups com mais de N dias
   → grava registro em obra_backup_log
```

### Passos que VOCÊ faz uma vez (5 min)
1. **Google Cloud Console** → Criar projeto (ou usar existente).
2. Habilitar **Google Drive API**.
3. **IAM & Admin → Service Accounts** → Create → baixar a chave em **JSON**.
4. **Google Drive** → criar pasta "OTOVISION Backups" → botão direito → Compartilhar → colar o e-mail da service account (`xxx@xxx.iam.gserviceaccount.com`) com permissão **Editor**.
5. Copiar o **ID da pasta** (parte da URL `drive.google.com/drive/folders/<ID>`).

Você me envia: o **JSON da service account** (cole inteiro) + o **ID da pasta**. Vou pedir como secrets.

### O que vou implementar

**1. Secrets (vou solicitar via add_secret após você aprovar):**
- `GOOGLE_SERVICE_ACCOUNT_JSON` — conteúdo bruto da chave JSON.
- `GOOGLE_DRIVE_BACKUP_FOLDER_ID` — id da pasta compartilhada.

**2. Tabela `obra_backup_log`** (migration):
- `id`, `user_id`, `executado_em`, `arquivo_nome`, `drive_file_id`, `drive_link`, `tamanho_bytes`, `status`, `erro`, `tipo` (`auto`|`manual`).
- RLS: usuário vê só os próprios.

**3. Edge function `backup-para-drive`** (`supabase/functions/backup-para-drive/index.ts`):
- Aceita `{ user_id?, manual?: boolean }`. Sem user_id → roda pra todos os usuários com dados.
- Reaproveita lista de TABLES da função `exportar-backup` existente.
- Gera JWT RS256 manualmente (sem libs externas) com `crypto.subtle` → troca por access_token em `https://oauth2.googleapis.com/token` (escopo `drive.file`).
- Upload `multipart/related` em `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart` → metadata `{ name: 'otovision-backup-{user}-{YYYY-MM-DD}.json', parents: [FOLDER_ID] }`.
- Lista arquivos da pasta com prefixo do user → apaga os com idade > **30 dias** (configurável).
- Insere registro em `obra_backup_log`.

**4. Cron job** (executar via SQL no Supabase, não como migration — contém a anon key):
- Habilitar `pg_cron` e `pg_net`.
- Agendar `0 3 * * *` (03h UTC diariamente) chamando a edge function.

**5. UI em `ConfiguracoesPage.tsx`** (seção Backup):
- Botão **"Fazer backup agora"** → invoca a function com `manual: true` → toast com link do Drive.
- Lista dos últimos 10 backups (data, tamanho, link "Abrir no Drive", status).
- Toggle informativo: "Backup automático diário às 03h ✓ ativo".

### Arquivos
- `supabase/functions/backup-para-drive/index.ts` (novo)
- migration: `obra_backup_log` + RLS
- SQL manual (cron) — depois de deploy
- `src/pages/ConfiguracoesPage.tsx` (botão + lista)

### Retenção / segurança
- Mantém últimos 30 dias por padrão.
- Service account só acessa a pasta que você compartilhou (escopo mínimo).
- Logs de erro vão pra `obra_backup_log.erro` e Edge Function logs.

### Próximo passo
Após você aprovar, eu peço os 2 secrets e sigo a implementação.

