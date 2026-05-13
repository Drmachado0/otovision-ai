import { describe, it, expect } from "vitest";
import {
  calcularTotaisItem,
  calcularTotaisFolha,
  validarFolha,
  parseFolhaJson,
  competenciaLabel,
  referenciaFolha,
  normalizarCpf,
} from "@/lib/folhaPagamento";

describe("folhaPagamento", () => {
  it("calcula total de item", () => {
    const it = calcularTotaisItem({
      ref: 1, nome: "X", cpf: "", funcao: "", qtd_diaria: 24, valor_diaria: 140,
      quinzena: 900, vales: 0, alimentacao: 193, encerramento: 0, ferias_13: 0, horas_extras: 0,
    });
    expect(it.total_diarias).toBe(3360);
    expect(it.total_geral).toBe(3360 + 900 + 193);
  });

  it("calcula totais da folha", () => {
    const itens = [
      calcularTotaisItem({ ref: 1, nome: "A", cpf: "", funcao: "", qtd_diaria: 10, valor_diaria: 100, quinzena: 200, vales: 0, alimentacao: 0, encerramento: 0, ferias_13: 0, horas_extras: 0 }),
      calcularTotaisItem({ ref: 2, nome: "B", cpf: "", funcao: "", qtd_diaria: 5, valor_diaria: 200, quinzena: 0, vales: 50, alimentacao: 0, encerramento: 0, ferias_13: 0, horas_extras: 0 }),
    ];
    const encargos = [{ tipo: "fgts", descricao: "FGTS", valor: 80 }];
    const t = calcularTotaisFolha(itens, encargos);
    expect(t.total_diarias).toBe(2000);
    expect(t.total_funcionarios).toBe(2250); // 1200 + 1050
    expect(t.total_encargos).toBe(80);
    expect(t.total_geral).toBe(2330);
  });

  it("validação detecta diferença e duplicatas", () => {
    const itens = [
      calcularTotaisItem({ ref: 1, nome: "Joao", cpf: "111", funcao: "", qtd_diaria: 1, valor_diaria: 100, quinzena: 0, vales: 0, alimentacao: 0, encerramento: 0, ferias_13: 0, horas_extras: 0 }),
      calcularTotaisItem({ ref: 2, nome: "Joao", cpf: "111", funcao: "", qtd_diaria: 1, valor_diaria: 100, quinzena: 0, vales: 0, alimentacao: 0, encerramento: 0, ferias_13: 0, horas_extras: 0 }),
    ];
    const v = validarFolha(itens, [], 999);
    expect(v.alertas.some((a) => a.includes("CPF duplicado"))).toBe(true);
    expect(v.alertas.some((a) => a.includes("Diferença"))).toBe(true);
  });

  it("parseFolhaJson aceita payload do brief", () => {
    const out = parseFolhaJson({
      competencia: "2026-04",
      titulo: "Folha abril",
      data_fechamento: "2026-04-30",
      funcionarios: [
        { ref: 1, nome: "X", cpf: "000.000.000-00", funcao: "Pedreiro",
          qtd_diaria: 24, valor_diaria: 140, quinzena: 900, vales: 0, alimentacao: 193,
          encerramento: 0, ferias_13: 0, horas_extras: 0 },
      ],
      encargos: [{ tipo: "fgts", descricao: "FGTS", valor: 100 }],
      totais: { total_geral: 4553 },
    });
    expect(out.itens[0].total_diarias).toBe(3360);
    expect(out.encargos[0].valor).toBe(100);
    expect(out.total_informado).toBe(4553);
  });

  it("helpers", () => {
    expect(competenciaLabel("2026-04")).toBe("abril/2026");
    expect(referenciaFolha("2026-04")).toBe("FOLHA-2026-04");
    expect(normalizarCpf("000.111.222-33")).toBe("00011122233");
  });
});
