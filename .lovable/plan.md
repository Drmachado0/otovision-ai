

# Plano: Fornecedores no formulário + Categorias customizáveis

## Diagnóstico

**1. Fornecedores não aparecem**: Em `OrcamentosPage.tsx` (linha 509) e `ComprasPage.tsx`, o campo "Fornecedor" é um `<Input>` de texto livre. Nunca consulta `obra_fornecedores`. Por isso a lista cadastrada em /fornecedores não aparece como sugestão.

**2. Categorias fixas**: As categorias vêm de `CATEGORIAS_PADRAO` em `src/lib/formatters.ts` (constante hardcoded). Usado em 4 telas: Orçamentos, Compras, Fluxo de Caixa, e drawer de transação. Não há tabela `categorias` no banco.

## Solução

### A) Nova tabela `obra_categorias` (migração)
```
id uuid PK
user_id uuid (RLS por usuário)
nome text unique-per-user
created_at, deleted_at (soft delete)
```
- RLS: usuário só vê/edita as suas
- Seed automático: ao criar usuário, inserir as categorias padrão (ou inserir on-demand na primeira leitura se vazio)

### B) Novo hook `useCategorias`
- Busca categorias do banco (filtra `deleted_at IS NULL`)
- Faz fallback para `CATEGORIAS_PADRAO` se vazio
- Expõe `addCategoria(nome)` para criar nova
- Realtime via `useRealtimeSubscription("obra_categorias", ...)`

### C) Novo componente `CategoriaSelect`
Dropdown reutilizável com:
- Lista de categorias do hook
- Opção final **"+ Nova categoria..."** que abre um mini-dialog/prompt
- Após criar, seleciona automaticamente a nova

### D) Novo componente `FornecedorCombobox`
Combobox (autocomplete) que:
- Busca em `obra_fornecedores` (somente ativos: `deleted_at IS NULL`)
- Permite digitar livremente (caso o fornecedor ainda não esteja cadastrado)
- Mostra sugestões enquanto digita
- Atalho "+ Cadastrar novo fornecedor" abre um mini-dialog (nome + telefone) que insere em `obra_fornecedores` e seleciona

### E) Integração nas telas
Substituir `<Input fornecedor>` por `<FornecedorCombobox>` e `<select categoria>` por `<CategoriaSelect>` em:
- `src/pages/OrcamentosPage.tsx`
- `src/pages/ComprasPage.tsx`
- `src/pages/FluxoCaixaPage.tsx` (categoria)
- `src/components/TransacaoDetailDrawer.tsx` (categoria)

## Arquivos

**Novos:**
- Migração SQL: tabela `obra_categorias` + RLS + trigger updated_at
- `src/hooks/useCategorias.ts`
- `src/hooks/useFornecedores.ts`
- `src/components/CategoriaSelect.tsx`
- `src/components/FornecedorCombobox.tsx`

**Editados:**
- `src/pages/OrcamentosPage.tsx`
- `src/pages/ComprasPage.tsx`
- `src/pages/FluxoCaixaPage.tsx`
- `src/components/TransacaoDetailDrawer.tsx`

## Resultado
- Campo Fornecedor mostra a lista cadastrada com autocomplete + opção de cadastrar novo direto do formulário
- Categoria mostra padrões + customizadas + opção "+ Nova categoria"
- Categorias persistem no banco por usuário, sincronizadas via realtime

