import { describe, it, expect } from "vitest";
import {
  agruparPorMes,
  calcularFolhaMensal,
  labelMes,
  ultimosMeses,
} from "@/lib/folhaMaoObra";

describe("calcularFolhaMensal", () => {
  const trabalhadores = [
    { id: "a", nome: "Alice", funcao: "Pedreiro", aliquota_fgts: 8, aliquota_inss: 20, incide_encargos: true },
    { id: "b", nome: "Bob", funcao: "Ajudante", aliquota_fgts: 8, aliquota_inss: 20, incide_encargos: false },
  ];
  const registros = [
    { trabalhador_id: "a", data: "2026-05-02", valor: 100 },
    { trabalhador_id: "a", data: "2026-05-03", valor: 100 },
    { trabalhador_id: "b", data: "2026-05-02", valor: 90 },
    { trabalhador_id: "a", data: "2026-04-01", valor: 100 }, // outro mês
  ];

  it("acumula bruto e dias por trabalhador (FGTS/INSS são manuais)", () => {
    const f = calcularFolhaMensal(trabalhadores, registros, "2026-05");
    const alice = f.itens.find((i) => i.trabalhador_id === "a")!;
    const bob = f.itens.find((i) => i.trabalhador_id === "b")!;

    expect(alice.bruto).toBe(200);
    expect(alice.dias).toBe(2);
    expect(alice.fgts).toBe(0);
    expect(alice.inss).toBe(0);
    expect(bob.bruto).toBe(90);

    expect(f.total_diarias).toBe(290);
    expect(f.total_fgts).toBe(0);
    expect(f.total_inss).toBe(0);
    expect(f.total_geral).toBe(290);
  });
});

describe("agruparPorMes / utils", () => {
  it("ultimosMeses retorna N meses ascendentes", () => {
    const res = ultimosMeses(3, new Date(2026, 4, 15)); // mai/2026
    expect(res).toEqual(["2026-03", "2026-04", "2026-05"]);
  });

  it("labelMes formata em pt-BR curto", () => {
    expect(labelMes("2026-05")).toBe("mai/26");
  });

  it("agrega diárias e encargos por mês", () => {
    const meses = ["2026-04", "2026-05"];
    const reg = [
      { trabalhador_id: "x", data: "2026-04-10", valor: 100 },
      { trabalhador_id: "x", data: "2026-05-10", valor: 200 },
    ];
    const folhas = [{ mes_ref: "2026-05", total_fgts: 16, total_inss: 40 }];
    const ag = agruparPorMes(reg, folhas, meses);
    expect(ag[0]).toMatchObject({ mes: "2026-04", diarias: 100, fgts: 0, inss: 0, total: 100 });
    expect(ag[1]).toMatchObject({ mes: "2026-05", diarias: 200, fgts: 16, inss: 40, total: 256 });
  });
});
