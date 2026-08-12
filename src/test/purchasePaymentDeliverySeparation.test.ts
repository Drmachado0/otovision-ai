import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const drawer = readFileSync("src/components/CompraDetailDrawer.tsx", "utf8");

describe("estado financeiro da compra não depende da entrega", () => {
  it("não bloqueia pagamento por status_entrega Entregue", () => {
    expect(drawer).not.toContain('tipo === "Única" && compra.status_entrega !== "Entregue"');
    expect(drawer).toContain('tipo === "Única"');
  });
});
