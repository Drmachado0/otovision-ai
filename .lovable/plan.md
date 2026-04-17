

## Plano: Conta obrigatória + padrão pré-selecionada no Leitor IA

### Diagnóstico
No `LeitorIAPage.tsx` (após processar pela IA), o campo **Conta** existe mas:
1. Vem vazio por padrão — usuário pode salvar sem escolher.
2. Não há validação obrigando a seleção antes de Salvar.

### O que vou fazer
1. Em `src/pages/LeitorIAPage.tsx`:
   - Ao carregar contas (`obra_contas_bancarias`), identificar a conta marcada como padrão (`padrao = true` ou primeira ativa) e setar como valor inicial de `conta_id` no estado do formulário.
   - Adicionar `*` visual no label "Conta".
   - No handler de Salvar, validar `if (!conta_id)` → `toast.error("Selecione uma conta")` e abortar.
   - Mesma validação aplicada para fluxo parcelado/recorrente.

2. Verificar se já existe campo `padrao` em `obra_contas_bancarias`. Se não, usar a primeira conta ativa como fallback.

### Arquivo a editar
- `src/pages/LeitorIAPage.tsx`

### Resultado
Ao abrir o painel de revisão pós-IA, a conta padrão já vem selecionada e o botão Salvar bloqueia se o campo estiver vazio.

