## Melhorias em Mão de Obra

Plano para evoluir `MaoDeObraPage` com gestão de folha mensal, encargos (FGTS/INSS), gráfico de despesas e integração com Contas a Pagar.

### 1. Banco de dados (migration)

Adicionar campos e tabela para encargos:

```sql
-- Configuração de alíquotas em obra_mao_de_obra
ALTER TABLE obra_mao_de_obra
  ADD COLUMN aliquota_fgts numeric DEFAULT 8,
  ADD COLUMN aliquota_inss numeric DEFAULT 20,
  ADD COLUMN incide_encargos boolean DEFAULT false;

-- Histórico de folhas/encargos lançados
CREATE TABLE obra_mao_obra_folha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mes_ref text NOT NULL,           -- '2026-05'
  total_diarias numeric NOT NULL,
  total_fgts numeric NOT NULL DEFAULT 0,
  total_inss numeric NOT NULL DEFAULT 0,
  detalhes jsonb,                  -- breakdown por trabalhador
  transacao_fgts_id uuid,          -- FK lógica para obra_transacoes_fluxo
  transacao_inss_id uuid,
  status text DEFAULT 'lancada',
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(user_id, mes_ref)
);
```

RLS padrão dos demais `obra_*` (acesso restrito ao `user_id` autenticado).

### 2. Lançamento automático com confirmação

Fluxo do botão "Lançar encargos do mês":

```text
[clique] → calcula:
   total_diarias = soma de obra_mao_obra_registros do mês (trabalhadores incide_encargos=true)
   total_fgts    = Σ (registro.valor × trabalhador.aliquota_fgts/100)
   total_inss    = Σ (registro.valor × trabalhador.aliquota_inss/100)
→ abre Dialog com valores sugeridos editáveis + escolha de conta + data
→ confirma:
   1) insert em obra_mao_obra_folha
   2) insert em obra_transacoes_fluxo (tipo='Saída', categoria='Encargos FGTS', referência='FOLHA-FGTS-YYYY-MM')
   3) insert em obra_transacoes_fluxo (categoria='Encargos INSS')
   4) salva ids em obra_mao_obra_folha
```

Se o mês já tem folha lançada, mostra status "Lançada" e desabilita o botão (com link para editar/estornar).

### 3. Folha de pagamento mensal (nova aba)

Reorganizar a página em **3 abas** (`Tabs`):
- **Trabalhadores** — grid atual (com filtros novos).
- **Folha do mês** — seletor de mês + tabela: nome | função | dias | bruto | FGTS | INSS | total. Totais no rodapé. Botão "Lançar encargos" e "Lançar diárias em Contas a Pagar" (cria 1 transação por trabalhador).
- **Histórico** — gráfico + lista de folhas anteriores.

### 4. Gráfico de despesas mês a mês

Componente Recharts (BarChart) nos últimos 12 meses, agregando `obra_mao_obra_registros.valor` + `obra_mao_obra_folha.total_fgts/inss` por mês. Cor primária do tema. Localizado na aba Histórico, acima da lista.

### 5. Filtros e busca (aba Trabalhadores)

- Input de busca por nome/função.
- Toggle de status: Todos / Ativos / Inativos.
- Botão para alternar visualização cards/lista (opcional).

### 6. Integração com Contas a Pagar

Os 2 lançamentos de encargos (FGTS, INSS) e as diárias acumuladas geram registros em `obra_transacoes_fluxo` com `tipo='Saída'`, categoria adequada e `referencia` rastreável (ex.: `FOLHA-FGTS-2026-05`), aparecendo automaticamente em `ContasAPagarPage`.

### 7. Formulário de trabalhador

Adicionar no Dialog:
- Switch "Calcular encargos (FGTS/INSS)".
- Inputs % FGTS (default 8) e % INSS (default 20) — visíveis quando o switch está ativo.

### 8. Arquivos afetados

- `supabase/migrations/<ts>_mao_obra_folha.sql` (novo)
- `src/pages/MaoDeObraPage.tsx` (refatorar em abas + filtros)
- `src/components/MaoObraFolhaTab.tsx` (novo) — tabela folha + lançamento encargos
- `src/components/MaoObraHistoricoChart.tsx` (novo) — gráfico 12 meses
- `src/lib/folhaMaoObra.ts` (novo) — funções puras de cálculo (testáveis)

### 9. Testes

`src/test/folhaMaoObra.test.ts` cobrindo cálculo de FGTS/INSS por trabalhador e consolidação mensal.

### Notas técnicas

- Cálculo somente para trabalhadores `incide_encargos=true` (informais/diaristas continuam fora por padrão).
- Lançamento de encargos é idempotente por mês (constraint UNIQUE).
- Gráfico usa `useMemo` agrupando registros já carregados; busca extra no backend só para histórico além do mês corrente.
- Realtime mantido para `obra_mao_de_obra`, `obra_mao_obra_registros` e nova tabela `obra_mao_obra_folha`.
