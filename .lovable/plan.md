
## Plano: corrigir saldo inicial no Fluxo de Caixa

### Diagnóstico
Confirmei o problema: o valor inicial da conta está correto em `ContasBancariasPage.tsx`, mas o `FluxoCaixaPage.tsx` calcula **Entradas / Saídas / Saldo** usando só `obra_transacoes_fluxo`.  
Ou seja: o saldo inicial de `obra_contas_financeiras.saldo_inicial` nunca entra na conta.

Isso explica exatamente seu caso:
- Saldo inicial da conta: **R$ 230.000,00**
- Saídas pagas: **R$ 9.367,80**
- Saldo correto: **R$ 220.632,20**
- Hoje o Fluxo mostra entrada **R$ 0,00** porque ignora o saldo inicial.

### O que vou ajustar
1. **Unificar a regra financeira**
   - Considerar `saldo_inicial` das contas como base do caixa.
   - Manter a mesma lógica entre telas para não haver números diferentes.

2. **Corrigir `src/pages/FluxoCaixaPage.tsx`**
   - Buscar também as contas financeiras ativas com `saldo_inicial`.
   - Somar:
     - `entradas_operacionais`
     - `saldo_inicial_total`
   - Exibir:
     - **Entradas = saldo inicial + entradas registradas**
     - **Saldo = saldo inicial + entradas - saídas**
   - Isso fará o Fluxo refletir o mesmo total visto em Contas Bancárias.

3. **Revisar telas relacionadas com a mesma falha**
   - `src/pages/ResumoMensalPage.tsx`
   - `src/pages/DashboardPage.tsx`
   - `src/pages/Dashboard.tsx`  
   Hoje elas também acumulam valores só a partir das transações, então o saldo inicial pode ficar fora dos totais e gráficos.

4. **Criar helper compartilhado**
   - Extrair a regra para um utilitário comum, evitando que uma tela some saldo inicial e outra não.
   - Assim futuras mudanças ficam centralizadas.

### Arquivos a editar
- `src/pages/FluxoCaixaPage.tsx`
- `src/pages/ResumoMensalPage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/Dashboard.tsx`
- possivelmente um novo utilitário em `src/lib/` para centralizar o cálculo

### Regra que vou aplicar
```text
saldo_base = soma dos saldos_iniciais das contas ativas
entradas_totais = saldo_base + soma das transações de entrada
saldo_final = saldo_base + entradas - saídas
```

### Resultado esperado
Para o seu cenário, o Fluxo de Caixa deve passar a mostrar algo equivalente a:
- **Entradas:** R$ 230.000,00
- **Saídas:** R$ 9.367,80
- **Saldo:** R$ 220.632,20

## Detalhe técnico
Hoje a divergência está assim:
- `ContasBancariasPage.tsx` usa `Number(conta.saldo_inicial) + entradas - saidas`
- `FluxoCaixaPage.tsx` usa apenas `rows.filter(tipo === "Entrada")` e `rows.filter(tipo === "Saída")`

Então o problema não é banco nem cadastro da conta: é a fórmula usada no front nessas páginas.
