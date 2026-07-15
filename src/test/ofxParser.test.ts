import { describe, expect, it } from "vitest";
import { parseOFX, parseCSV, parseStatement } from "@/lib/ofxParser";

const ofxTransacao = (trntype: string, amt: string, memo: string) => `
<STMTTRN>
<TRNTYPE>${trntype}
<DTPOSTED>20260115120000[-3:BRT]
<TRNAMT>${amt}
<FITID>${memo}-id
<MEMO>${memo}
</STMTTRN>`;

describe("parseOFX - classificação débito/crédito", () => {
  it("usa o sinal negativo como saída", () => {
    const txs = parseOFX(ofxTransacao("DEBIT", "-150.00", "Compra"));
    expect(txs[0]).toMatchObject({ valor: 150, tipo: "Saída" });
  });

  it("classifica débito POSITIVO via TRNTYPE (bug corrigido)", () => {
    // Banco que não sinaliza débito: valor positivo mas TRNTYPE=DEBIT.
    const txs = parseOFX(ofxTransacao("DEBIT", "150.00", "Boleto"));
    expect(txs[0]).toMatchObject({ valor: 150, tipo: "Saída" });
  });

  it("classifica crédito positivo como entrada", () => {
    const txs = parseOFX(ofxTransacao("CREDIT", "200.00", "Deposito"));
    expect(txs[0]).toMatchObject({ valor: 200, tipo: "Entrada" });
  });

  it("reconhece tipos de débito variados (FEE, SRVCHG)", () => {
    expect(parseOFX(ofxTransacao("FEE", "9.90", "Tarifa"))[0].tipo).toBe("Saída");
    expect(parseOFX(ofxTransacao("SRVCHG", "5.00", "Serviço"))[0].tipo).toBe("Saída");
  });

  it("extrai data no formato ISO removendo o sufixo de timezone", () => {
    const txs = parseOFX(ofxTransacao("CREDIT", "10.00", "x"));
    expect(txs[0].data).toBe("2026-01-15");
  });
});

describe("parseCSV", () => {
  it("classifica por sinal quando há coluna única de valor", () => {
    const csv = "Data;Descricao;Valor\n15/01/2026;Compra;-150,00\n16/01/2026;Salario;3.000,50";
    const txs = parseCSV(csv);
    expect(txs).toHaveLength(2);
    expect(txs[0]).toMatchObject({ descricao: "Compra", valor: 150, tipo: "Saída" });
    expect(txs[1]).toMatchObject({ descricao: "Salario", valor: 3000.5, tipo: "Entrada" });
  });

  it("usa colunas separadas de crédito/débito", () => {
    const csv = "Data,Historico,Credito,Debito\n15/01/2026,Deposito,500.00,0\n16/01/2026,Saque,0,200.00";
    const txs = parseCSV(csv);
    expect(txs[0]).toMatchObject({ valor: 500, tipo: "Entrada" });
    expect(txs[1]).toMatchObject({ valor: 200, tipo: "Saída" });
  });
});

describe("parseStatement", () => {
  it("detecta OFX pelo conteúdo mesmo sem extensão", () => {
    const txs = parseStatement(ofxTransacao("DEBIT", "-1.00", "x"), "extrato.txt");
    expect(txs[0].tipo).toBe("Saída");
  });
});
