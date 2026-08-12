import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/pages/ContasAPagarPage.tsx", "utf8");

describe("Contas a Pagar não gera recorrências no navegador", () => {
  it("não importa nem executa o motor client-side", () => {
    expect(page).not.toContain('from "@/lib/recurrenceEngine"');
    expect(page).not.toContain("processRecurrences(");
  });
});
