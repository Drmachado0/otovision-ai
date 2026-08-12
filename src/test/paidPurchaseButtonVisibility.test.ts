import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const drawer = readFileSync("src/components/CompraDetailDrawer.tsx", "utf8");

describe("visibilidade de pagamento de compra", () => {
  it("oculta pagamento integral quando o estado financeiro já é pago", () => {
    expect(drawer).toContain('tipo === "Única" && compra.status_pagamento?.toLowerCase() !== "pago"');
  });
});
