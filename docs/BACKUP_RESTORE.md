# Guia de Teste de Backup e Restore

## Situação Atual

O sistema tem **backup automático diário** (Edge Function `backup-diario-automatico`), mas **o restore nunca foi testado**.

## Risco

Se o backup estiver corrompido ou incompleto, a recuperação de desastre falhará quando mais precisarmos.

## Teste de Restore (Recomendado: mensal)

### 1. Backup Manual

```bash
# Via Supabase CLI
supabase db dump -f backup_manual_$(date +%Y%m%d_%H%M%S).sql

# Ou via Dashboard Supabase
# Project > Database > Backups > Download
```

### 2. Teste de Restore em Staging

```bash
# 1. Criar branch de staging (se não existir)
supabase branches create restore-test

# 2. Aplicar backup no staging
psql $STAGING_DATABASE_URL < backup_manual_20260819.sql

# 3. Validar dados
psql $STAGING_DATABASE_URL -c "SELECT COUNT(*) FROM obra_transacoes_fluxo;"
psql $STAGING_DATABASE_URL -c "SELECT COUNT(*) FROM obra_compras;"

# 4. Testar aplicação no staging
# Abrir https://staging.otovisioncontrole.lovable.app e validar funcionalidades

# 5. Limpar branch de teste
supabase branches delete restore-test
```

### 3. Checklist de Validação

Após restore, verificar:

- [ ] Número de registros por tabela
- [ ] Integridade referencial (foreign keys)
- [ ] Dados financeiros (somas, totais)
- [ ] Usuários e permissões
- [ ] Configurações da obra
- [ ] Documentos processados
- [ ] Comissões calculadas

### 4. Teste de Restore Completo (Anual)

Simular desastre completo:

1. **Criar projeto Supabase novo** (vazio)
2. **Aplicar todas as migrations**
3. **Restaurar backup completo**
4. **Configurar variáveis de ambiente**
5. **Deploy da aplicação**
6. **Validar todas as funcionalidades**
7. **Documentar tempo de recuperação (RTO)**

## Backup Automático

### Configuração Atual

- **Frequência**: Diário (via pg_cron)
- **Retenção**: Configurável (padrão: 30 dias)
- **Destino**: Bucket privado Supabase Storage
- **Opcional**: Cópia para Google Drive

### Verificar Backup

```bash
# Listar backups no Storage
supabase storage ls backups

# Ou via SQL
SELECT * FROM storage.objects WHERE bucket_id = 'backups' ORDER BY created_at DESC;
```

## Melhorias Recomendadas

### Curto Prazo
- [ ] Testar restore mensalmente
- [ ] Documentar tempo de recuperação
- [ ] Automatizar validação pós-restore

### Médio Prazo
- [ ] Backup incremental (WAL-G ou similar)
- [ ] Monitoramento de falhas de backup
- [ ] Alertas quando backup falha

### Longo Prazo
- [ ] Disaster recovery automatizado
- [ ] Réplica em região diferente
- [ ] Teste de restore automatizado em CI

## Contato

Em caso de falha de backup ou restore:
1. Verificar logs no Supabase Dashboard
2. Consultar documentação: https://supabase.com/docs/guides/platform/backups
3. Contatar suporte Supabase se necessário
