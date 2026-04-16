import { describe, it, expect } from "vitest";
import { filterByDateRange, filterByCategoria, exportCSV } from "@/lib/types";

describe("filterByDateRange", () => {
  const items = [
    { id: 1, data: "2024-01-10", nome: "A" },
    { id: 2, data: "2024-03-15", nome: "B" },
    { id: 3, data: "2024-06-20", nome: "C" },
    { id: 4, data: "2024-09-01", nome: "D" },
  ];

  it("retorna todos quando nenhum filtro aplicado", () => {
    const result = filterByDateRange(items, "data", "", "");
    expect(result).toHaveLength(4);
  });

  it("filtra por data início", () => {
    const result = filterByDateRange(items, "data", "2024-03-01", "");
    expect(result).toHaveLength(3);
    expect(result[0].nome).toBe("B");
  });

  it("filtra por data fim", () => {
    const result = filterByDateRange(items, "data", "", "2024-06-30");
    expect(result).toHaveLength(3);
  });

  it("filtra por intervalo", () => {
    const result = filterByDateRange(items, "data", "2024-02-01", "2024-07-01");
    expect(result).toHaveLength(2);
    expect(result.map(i => i.nome)).toEqual(["B", "C"]);
  });

  it("inclui itens sem data no campo", () => {
    const withNull = [...items, { id: 5, data: undefined as unknown as string, nome: "E" }];
    const result = filterByDateRange(withNull, "data", "2024-06-01", "");
    expect(result.some(i => i.nome === "E")).toBe(true);
  });
});

describe("filterByCategoria", () => {
  const items = [
    { id: 1, categoria: "Material" },
    { id: 2, categoria: "Serviço" },
    { id: 3, categoria: "Material" },
  ];

  it("retorna todos quando filtro é 'todas'", () => {
    expect(filterByCategoria(items, "todas")).toHaveLength(3);
  });

  it("filtra por categoria específica", () => {
    const result = filterByCategoria(items, "Material");
    expect(result).toHaveLength(2);
  });

  it("retorna vazio quando categoria não existe", () => {
    expect(filterByCategoria(items, "Transporte")).toHaveLength(0);
  });
});

describe("exportCSV", () => {
  it("não lança erro ao gerar CSV", () => {
    // Mock DOM APIs not available in jsdom
    const mockLink = { href: "", download: "", click: vi.fn() };
    vi.spyOn(document, "createElement").mockReturnValue(mockLink as unknown as HTMLAnchorElement);
    globalThis.URL.createObjectURL = vi.fn(() => "blob:mock");
    globalThis.URL.revokeObjectURL = vi.fn();

    const data = [
      { nome: "Item 1", valor: 100 },
      { nome: "Item 2", valor: 200 },
    ];

    expect(() => {
      exportCSV(data, "test", [
        { key: "nome", label: "Nome" },
        { key: "valor", label: "Valor" },
      ]);
    }).not.toThrow();

    expect(mockLink.click).toHaveBeenCalled();
    expect(mockLink.download).toBe("test.csv");
  });
});
