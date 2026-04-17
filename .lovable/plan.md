

## Plano: botão "Excluir leitura" em cada documento

### Diagnóstico
Em `src/pages/PastaMonitorPage.tsx`, cada linha da tabela (Notas Fiscais / Outros) tem só dois botões em **Ações**: 👁 Visualizar e 🔄 Reprocessar (este último só aparece em erro/revisão). Não existe forma de **apagar** uma leitura para refazê-la do zero — por isso o usuário fica preso ao registro processado.

### O que vou fazer

1. **Adicionar handler `excluirDocumento`** em `src/hooks/useDocumentos.ts`:
   - Soft delete via `update({ deleted_at: ... })` em `obra_documentos_processados` (padrão do projeto).
   - Se houver `storage_path`, remover do bucket também (opcional, manter por enquanto).
   - Após sucesso, chamar `fetchDocumentos()` para atualizar a lista.

2. **Em `PastaMonitorPage.tsx`**:
   - Importar ícone `Trash2`.
   - Adicionar prop `onDelete` em `DocumentRow` e `DocumentGroup`.
   - Renderizar botão de lixeira (vermelho discreto) ao lado de Visualizar/Reprocessar, **sempre** disponível.
   - Ao clicar, abrir `ConfirmDialog` (já existe em `@/components/ConfirmDialog`) perguntando: *"Excluir leitura de {nome_arquivo}? Você poderá reenviar o arquivo depois."*
   - Confirmar → chama `excluirDocumento(doc.id)` → toast de sucesso.

3. **Filtrar deletados** no fetch (`useDocumentos.fetchDocumentos`): adicionar `.is("deleted_at", null)` se a coluna existir; senão usar hard delete simples.

4. **Verificar coluna `deleted_at`** em `obra_documentos_processados` antes de implementar — se não existir, faço hard delete (`.delete()`) com aviso de que é definitivo.

### Arquivos a editar
- `src/hooks/useDocumentos.ts` (nova função `excluirDocumento`, filtro)
- `src/pages/PastaMonitorPage.tsx` (botão + confirm dialog + handler)

### Resultado esperado
Cada linha em **Notas Fiscais** e **Outros** ganha um ícone de lixeira. Clicar pede confirmação e remove a leitura — liberando o usuário para reenviar o arquivo e processar novamente do zero.

