import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const componentPath = "src/components/BankStatementImportCard.tsx";
const fluxoPath = "src/pages/FluxoCaixaPage.tsx";
const source = () => existsSync(componentPath) ? readFileSync(componentPath, "utf8") : "";

describe("interface de importação bancária", () => {
  it("aceita OFX, exige conta e usa o parser determinístico", () => {
    const code = source();
    expect(existsSync(componentPath)).toBe(true);
    expect(code).toContain("parseStatement");
    expect(code).toContain('accept=".ofx,.ofc,application/x-ofx"');
    expect(code).toContain("Selecione uma conta");
    expect(code).toContain("FITID");
  });

  it("registra documento e chama somente a RPC de importação", () => {
    const code = source();
    expect(code).toContain('from("obra_documentos_processados")');
    expect(code).toContain('rpc("import_bank_statement"');
    expect(code).not.toContain('from("obra_transacoes_fluxo")');
    expect(code).toContain("pendentes de revisão");
  });

  it("é exibida no Fluxo de Caixa", () => {
    const page = readFileSync(fluxoPath, "utf8");
    expect(page).toContain("BankStatementImportCard");
    expect(page).toContain("<BankStatementImportCard");
  });
});
