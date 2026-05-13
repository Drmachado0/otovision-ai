## Objetivo

Refatorar a aba **Mão de Obra** para que a folha mensal seja **detalhada por funcionário + encargos**, mas gere **apenas UM lançamento consolidado** no fluxo de caixa por competência (`FOLHA-YYYY-MM`).

---

## 1. Banco de dados (migration nova)

Substituir/complementar o modelo atual (`obra_mao_obra_folha` + `obra_mao_obra_folha_item`) por um modelo de competência fechada:

**`obra_folhas_pagamento`** (cabeçalho por mês)
- `id, user_id, competencia_mes (YYYY-MM), titulo, obra_nome, data_fechamento`
- `status` enum: `rascunho | conferida | lancada | paga | cancelada`
- totais: `total_diarias, total_quinzena, total_vales, total_alimentacao, total_encerramento, total_ferias_13, total_horas_extras, total_funcionarios, total_encargos, total_geral, diferenca_conferencia`
- `financeiro_transacao_id uuid null`, `comissao_id uuid null`, `gerar_comissao bool default true`
- `origem` (`manual|csv|imagem|hermes`), `observacoes`
- `created_at, updated_at, deleted_at`
- UNIQUE parcial `(user_id, competencia_mes) WHERE deleted_at IS NULL AND status <> 'cancelada'`

**`obra_folha_pagamento_itens`** (1 por funcionário/folha)
- `id, user_id, folha_id, trabalhador_id null`
- `ref, nome, cpf, funcao`
- `qtd_diaria, valor_diaria, total_diarias`
- `quinzena, vales, alimentacao, encerramento, ferias_13, horas_extras, total_geral, observacoes`
- `created_at, updated_at, deleted_at`

**`obra_folha_pagamento_encargos`**
- `id, user_id, folha_id, tipo (custos_engenharia|exames|fgts|inss|outros), descricao, valor, observacoes`
- `created_at, updated_at, deleted_at`

**`obra_mao_de_obra`** (alter): adicionar `cpf text`, `cpf_normalizado text` (índice).

RLS: `auth.uid() = user_id` em todas as 3 tabelas (select/insert/update/delete). Triggers `updated_at` + audit_log.

**RPC `lancar_folha_financeiro(p_folha_id uuid)`** (security definer):
1. valida ownership + status (`rascunho|conferida`)
2. trava `FOR UPDATE` na folha
3. checa duplicidade: `obra_transacoes_fluxo` ativo com `referencia = 'FOLHA-YYYY-MM'` → erro `DUPLICATE_REFERENCE`
4. insere 1 linha em `obra_transacoes_fluxo` (tipo `Saída`, categoria `Mão de Obra`, descricao `Folha de pagamento <mês>/<ano>`, valor=`total_geral`, data=`data_fechamento`, recorrencia `Única`, referencia `FOLHA-YYYY-MM`, origem_tipo `folha_pagamento`, origem_id, observações com resumo)
5. se `gerar_comissao` → insere 1 `obra_comissao_pagamentos` (8% do total)
6. atualiza folha: `status='lancada'`, salva `financeiro_transacao_id`, `comissao_id`
7. retorna `{transacao_id, comissao_id}`

**RPC `marcar_folha_paga(p_folha_id, p_data_pagamento, p_conta_id)`**: atualiza a transação consolidada para `Pago`, preenche `data_pagamento`, e seta `status='paga'` na folha. Não cria nova saída.

---

## 2. Lib (`src/lib/folhaPagamento.ts` — novo)

Funções puras:
- `competenciaLabel('2026-04') → 'abril/2026'`
- `referenciaFolha(comp) → 'FOLHA-2026-04'`
- `calcularTotaisItem(item)` — `total_diarias = qtd*valor`, `total_geral = diarias+quinzena+vales+alim+encerramento+ferias+he`
- `calcularTotaisFolha(itens, encargos)` — soma por categoria + `total_funcionarios`, `total_encargos`, `total_geral`
- `validarFolha(folha, itens, encargos)` → `{erros:[], alertas:[], diferenca}` (soma vs totais informados, CPF/nome duplicado, campos vazios, valores negativos)
- `parseFolhaJson(input)` — valida o JSON do Hermes (zod) e normaliza
- `normalizarCpf(s)` — só dígitos

Tests em `src/test/folhaPagamento.test.ts` (cálculos, validação, parse JSON do exemplo do brief).

---

## 3. UI

**Renomear aba antiga** "Folha do mês" → continuar existindo como **registro diário** (presença/diária avulsa). Adicionar **nova aba "Folhas mensais"** em `MaoDeObraPage`.

### `MaoObraFolhasMensaisTab.tsx` (novo)
Lista folhas (cards por competência) com: título, status badge, total geral, nº funcionários, ações.
- Botão **"Nova folha"** → dialog escolher competência
- Botão **"Importar folha (JSON)"** → cola JSON, valida com zod, abre editor
- Click na folha → abre `FolhaPagamentoEditor`

### `FolhaPagamentoEditor.tsx` (novo, drawer/page)
- Header: competência, título, obra, data fechamento, status badge, origem
- Painel de **conferência** (sempre visível): Total informado vs Total calculado, **Diferença** com cor, alertas
- **Tabela de funcionários** editável inline: REF, Nome, CPF, Função, Qtd, V.Diária, T.Diárias (auto), Quinzena, Vales, Alim., Encerr., Férias/13, HE, Total (auto), ações (remover linha). Botão "Adicionar funcionário".
- **Tabela de encargos** editável: tipo, descrição, valor. Botão "Adicionar encargo".
- Rodapé com somatórios por coluna.
- Toggle **"Gerar comissão 8%"**.
- Ações por status:
  - Rascunho: Salvar, Marcar como conferida, Cancelar
  - Conferida: **Lançar no Financeiro** (chama RPC)
  - Lançada: Ver transação, **Marcar como paga**, Reabrir (volta p/ rascunho — só se não paga)
  - Paga: Ver transação, somente leitura
- Após "Lançar": toast "Despesa criada: FOLHA-2026-04 — R$ X" + link para Contas a Pagar.
- Ao importar: faz upsert em `obra_mao_de_obra` por `cpf_normalizado` (ou nome normalizado se sem CPF), atualizando função/valor_diaria; vincula `trabalhador_id` no item.

### Ajustes na aba "Equipe/Mão de Obra" atual
- Renomear coluna "Horas" → **"Qtd diária"** (quando contrato = diária)
- KPI "Custo Mensal Estimado": deixar de fazer `valor_diaria * 22`. Em vez disso, mostrar **"Custo real folha (mês)"** se houver folha lançada na competência selecionada; senão mostrar estimativa marcada como "(estimado)".
- Adicionar seletor de competência que filtra os KPIs.

---

## 4. Importação Hermes (escopo desta entrega)

Apenas **botão "Importar folha (JSON)"** no front com validação zod do payload exemplo do brief. A integração com extração de imagem pelo Hermes (edge function de OCR/IA) fica para uma próxima entrega — o JSON pode ser colado/colocado por qualquer fonte.

---

## 5. Comissão e duplicidade

- 1 comissão de 8% por folha, vinculada ao `transacao_id` consolidado, idempotente por `folha_id`.
- Reabrir folha lançada: anula comissão (soft delete) e remove transação **se ainda pendente**; bloqueia reabrir se transação já paga.

---

## 6. Arquivos

**Migration**
- `supabase/migrations/<ts>_folha_pagamento_consolidada.sql`

**Lib + tests**
- `src/lib/folhaPagamento.ts` (novo)
- `src/test/folhaPagamento.test.ts` (novo)

**UI**
- `src/components/MaoObraFolhasMensaisTab.tsx` (novo)
- `src/components/FolhaPagamentoEditor.tsx` (novo)
- `src/components/ImportarFolhaDialog.tsx` (novo)
- `src/pages/MaoDeObraPage.tsx` (adicionar aba + ajustar KPIs)
- `src/components/MaoObraFolhaTab.tsx` (rebatizar internamente como "Diárias do mês"; manter funcional)

**Mantém compatibilidade** com tabelas atuais (`obra_mao_obra_folha*`) — não dropa nada; o novo modelo coexiste.

---

## Notas

- Tudo soft delete (`deleted_at`).
- Idempotência por `(user_id, competencia_mes)` ativa e por `referencia` no fluxo.
- Sem alteração no fluxo de pagamento existente além de **um único `obra_transacoes_fluxo` por folha**.
- Integração com OCR/Hermes (imagem → JSON) será planejada à parte; este escopo entrega o JSON-in completo + UI + RPCs + idempotência.
