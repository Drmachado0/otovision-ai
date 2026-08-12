# Acesso seguro do assistente de lançamentos

Esta integração permite ao Hermes analisar os dados do OTOVISION e criar lançamentos sem receber a senha pessoal do administrador.

## Modelo de segurança

- A ativação exige uma sessão Supabase autenticada com papel `admin`.
- O token operacional começa com `ova_`, é aleatório e exibido somente uma vez.
- O banco armazena apenas SHA-256 do token e um pequeno prefixo para identificação.
- O token expira em 180 dias e pode ser revogado imediatamente.
- Leitura, revogação, rotação e lançamento compartilham uma trava transacional por usuário; uma revogação confirmada precede operações posteriores.
- Escopos permitidos: `read` e `launch`.
- A API não oferece edição, exclusão, restauração, limpeza ou pagamento de registros existentes.
- Toda operação exige uma chave de idempotência e o hash SHA-256 do documento.
- Uma mesma mensagem ou arquivo não pode gerar dois lançamentos.
- Uma chave de idempotência só produz replay quando o hash e o pedido documental completo são idênticos; reutilizá-la para outro pedido é rejeitado.
- Documentos com confiança ausente, inválida ou inferior a 80; ambiguidade; categoria ausente; conta inválida; ou dados essenciais incompletos vão para revisão.
- As RPCs privilegiadas revalidam escopo, validade, usuário, conta, categoria, valores, parcelas, estados e semântica documental no PostgreSQL.
- A linha financeira gravada deve corresponder ao payload validado em valor, datas, descrição, categoria, conta, pagamento, destino e hash de origem.
- Não existe limite automático de valor, conforme política definida pelo proprietário.

## Componentes

- Migração: `supabase/migrations/20260812040000_assistant_delegated_access.sql`
- Edge Function: `supabase/functions/assistente-lancamentos/index.ts`
- Política testável: `supabase/functions/_shared/assistant-policy.ts`
- Interface administrativa: Configurações → Assistente de lançamentos
- Testes: `src/test/assistantLaunchPolicy.test.ts`

## Implantação

A implantação deve ocorrer primeiro em homologação:

Antes de usar uma homologação compartilhada, aplique a migração em um clone representativo do banco e valide rollback, ACLs das RPCs, triggers, concorrência entre leitura/lançamento/revogação e duração dos locks. Os testes Vitest de contrato são guardas estáticas e não substituem um PostgreSQL real.

1. Aplicar as migrações Supabase pendentes.
2. Fazer deploy da função `assistente-lancamentos`.
3. Confirmar os secrets padrão da função (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Eles são fornecidos pelo ambiente Supabase; nunca colocá-los no frontend.
4. Se necessário, configurar `ALLOWED_ORIGINS` com a origem exata do frontend. O padrão é `https://otovisionocontrole.lovable.app`; a função não usa origem curinga.
5. Publicar o frontend.
6. Entrar no OTOVISION como administrador, abrir Configurações → Assistente de lançamentos e escolher a conta padrão.
7. Clicar em “Ativar acesso”.
8. Copiar o token exibido uma única vez diretamente para o cofre de segredos do Hermes. Não enviar o token pelo Telegram, chat, e-mail ou commit.
9. Executar os testes de fumaça abaixo.

## Armazenamento no Hermes

O token é um segredo. Deve ficar em `$HERMES_HOME/.env`, nunca em `config.yaml`, memória, skill, prompt ou repositório. A configuração exata deve ser feita somente no ambiente onde o gateway Telegram executa.

Nome sugerido da variável:

`OTOVISION_ASSISTANT_TOKEN`

Também é necessário configurar como dado não secreto:

`OTOVISION_ASSISTANT_URL=https://ebyruchdswmkuynthiqi.supabase.co/functions/v1/assistente-lancamentos`

Não cole o valor do token nesta documentação.

## API

Base:

`https://ebyruchdswmkuynthiqi.supabase.co/functions/v1/assistente-lancamentos`

### Leitura do contexto

`GET ?resource=resumo|config|contas|categorias|fornecedores|transacoes|compras|documentos|auditoria&limit=100`

Cabeçalho:

`Authorization: Bearer ova_<token>`

As respostas são sempre filtradas pelo `user_id` proprietário da delegação. Recursos de alto volume têm limite máximo de 500 registros por chamada.

### Criar lançamento

`POST /assistente-lancamentos`

Campos essenciais:

- `tipo_documento`: `boleto`, `recibo`, `nota_fiscal` ou `comprovante`
- `descricao`
- `fornecedor` quando conhecido
- `valor` positivo
- `data_documento` em `YYYY-MM-DD`
- `data_vencimento` para boleto
- `categoria` já cadastrada no OTOVISION
- `forma_pagamento`
- `conta_id`; se omitida, a API usa a conta padrão da delegação
- `documento_hash`: SHA-256 hexadecimal do arquivo original
- `idempotency_key`: por exemplo `telegram:<chat_id>:<message_id>`
- `confianca`: mínimo 80 para gravação automática
- `ambiguo`: deve ser explicitamente `false`; ausente ou `true` exige revisão
- `quitado`: somente `true` quando o próprio documento ou comprovante anexo provar a quitação
- `source`: plataforma, chat, mensagem e nome do arquivo para auditoria

Política de destino:

- Nota fiscal não quitada → `obra_compras` como compromisso pendente.
- Boleto → `obra_transacoes_fluxo` como saída pendente.
- Recibo/comprovante com `quitado=true` → saída paga.
- Nota fiscal com quitação comprovada → saída paga; sem quitação → compra pendente.
- Recibo sem prova inequívoca → saída pendente.

### Ativação e revogação

São chamadas pela interface autenticada do frontend usando o cabeçalho interno `x-assistant-action`. Não devem ser chamadas pelo bot operacional.

## Testes de fumaça obrigatórios

1. Ativar uma delegação e confirmar que o token aparece uma única vez.
2. Consultar `resumo`, contas e categorias.
3. Enviar um documento de teste para homologação.
4. Repetir a mesma chave de idempotência e confirmar resposta de replay sem novo registro.
5. Repetir o mesmo arquivo com outra mensagem e confirmar bloqueio por duplicidade.
6. Enviar confiança 60 e confirmar HTTP 422/revisão.
7. Confirmar o registro em `obra_assistant_operations` e `obra_audit_log`.
8. Revogar o acesso e confirmar HTTP 401 na chamada seguinte.
9. Gerar novo token e confirmar que o token anterior permanece inválido.

## Operação pelo Telegram

Fluxo recomendado:

1. O usuário envia nota, recibo, boleto ou comprovante.
2. Hermes calcula SHA-256 do arquivo antes de processar.
3. Hermes consulta contas, categorias, fornecedores e lançamentos recentes.
4. Hermes extrai os dados e avalia confiança/ambiguidade.
5. Se os requisitos forem atendidos, envia a requisição idempotente.
6. Hermes responde com tipo, valor, categoria, conta, status e ID do registro.
7. Se houver revisão ou duplicidade, nada é gravado. A criação financeira, conclusão da operação e auditoria usam uma única transação PostgreSQL; qualquer falha reverte o conjunto inteiro.

## Revogação de emergência

No OTOVISION: Configurações → Assistente de lançamentos → “Revogar acesso”.

A revogação é imediata. Também se deve remover `OTOVISION_ASSISTANT_TOKEN` do cofre do Hermes. A senha do usuário não precisa ser alterada porque não participa desta integração.
