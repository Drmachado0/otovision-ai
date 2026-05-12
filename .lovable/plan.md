## Folha completa com lançamentos manuais (modelo planilha)

Hoje a aba **Folha do mês** só calcula Bruto + FGTS + INSS automáticos. O modelo enviado mostra que o total real da folha precisa de várias outras colunas/linhas que devem ser **lançadas manualmente** por trabalhador e/ou por mês para chegar no TOTAL/GERAL correto.

### O que será adicionado

**Por trabalhador (linha editável na tabela):**
- Quinzena (R$)
- Vales (R$)
- Vale Alimentação (R$)
- Encerramento (R$)
- Férias / 13° (R$)
- Horas Extras (R$)

Cada campo é input numérico inline, salvo na hora. O **TOTAL/GERAL** da linha passa a ser:
`Bruto + FGTS + INSS + Quinzena + Vales + V.Alim + Encerramento + Férias/13° + HorasExtras`

**Por mês (linhas extras no rodapé, além do total):**
- Custos Engenharia
- Exames Funcionários (Admissional/Periódico)
- (FGTS e INSS já existem)

**Totais consolidados (rodapé estilo planilha):**
- Sub-total por categoria (Quinzena, Vales, V.Alim, Encerramento, Férias, HE)
- TOTAL GERAL da folha do mês

### Banco de dados

Nova tabela `obra_mao_obra_folha_item` (lançamentos manuais por trabalhador/mês):

```text
id, user_id, trabalhador_id, mes_ref,
quinzena, vales, vale_alimentacao,
encerramento, ferias_decimo, horas_extras,
observacao, created_at, updated_at, deleted_at
UNIQUE(user_id, trabalhador_id, mes_ref)
```

Adicionar em `obra_mao_obra_folha` (totais do mês):
- `custos_engenharia numeric default 0`
- `exames numeric default 0`
- `total_quinzena, total_vales, total_vale_alim, total_encerramento, total_ferias, total_horas_extras numeric default 0`
- `total_geral numeric` (computado no save)

### UI

**`MaoObraFolhaTab.tsx`** ganha:
- Tabela ampliada com colunas editáveis (debounce ~500ms para salvar).
- Card "Custos do mês" acima ou abaixo da tabela com 2 inputs (Custos Engenharia, Exames).
- KPIs ampliados: Diárias, Encargos (FGTS+INSS), Adicionais (quinzena+vales+...), Custos Mês, **Total Geral**.
- Layout responsivo: scroll horizontal na tabela (já existe).

**Lançamento em Contas a Pagar:** o botão atual continua gerando FGTS + INSS. Adicionar opção (checkbox no dialog) para gerar também:
- 1 transação por trabalhador com `quinzena + vales + vale_alim + encerramento + ferias + horas_extras` (se > 0), categoria "Folha de Pagamento".
- 1 transação para Custos Engenharia e 1 para Exames (se > 0).

### Arquivos afetados

- `supabase/migrations/<ts>_folha_itens_manual.sql` (novo)
- `src/lib/folhaMaoObra.ts` — incluir campos extras em `FolhaItem`/`FolhaResumo` e recalcular totais
- `src/components/MaoObraFolhaTab.tsx` — colunas editáveis + custos do mês + KPIs novos
- `src/test/folhaMaoObra.test.ts` — cobrir soma com adicionais

### Notas

- Campos manuais não dependem de registros de presença — funcionam mesmo no modo "estimativa".
- Salvamento por célula é otimista (toast de erro caso falhe).
- Idempotência por `(user_id, trabalhador_id, mes_ref)`.
