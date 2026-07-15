import { describe, expect, it } from "vitest";
import {
  parseLocalDate,
  formatLocalISO,
  addMonthsClamped,
  addIntervalClamped,
} from "@/lib/dateUtils";

describe("parseLocalDate / formatLocalISO", () => {
  it("faz round-trip sem drift de timezone", () => {
    // O bug clássico: new Date('2026-01-31') vira 2026-01-30 em UTC-3.
    expect(formatLocalISO(parseLocalDate("2026-01-31"))).toBe("2026-01-31");
    expect(formatLocalISO(parseLocalDate("2026-12-01"))).toBe("2026-12-01");
  });
});

describe("addMonthsClamped", () => {
  it("faz clamp no último dia do mês de destino", () => {
    expect(addMonthsClamped("2026-01-31", 1)).toBe("2026-02-28"); // não vaza pra março
    expect(addMonthsClamped("2024-01-31", 1)).toBe("2024-02-29"); // ano bissexto
    expect(addMonthsClamped("2026-01-31", 3)).toBe("2026-04-30");
  });

  it("mantém o dia quando o mês de destino comporta", () => {
    expect(addMonthsClamped("2026-01-15", 1)).toBe("2026-02-15");
  });

  it("atravessa a virada de ano corretamente", () => {
    expect(addMonthsClamped("2026-11-30", 2)).toBe("2027-01-30");
    expect(addMonthsClamped("2026-12-31", 1)).toBe("2027-01-31");
  });
});

describe("addIntervalClamped", () => {
  it("Mensal soma 1 mês com clamp", () => {
    expect(addIntervalClamped("2026-01-31", "Mensal")).toBe("2026-02-28");
  });

  it("Trimestral soma 3 meses", () => {
    expect(addIntervalClamped("2026-01-31", "Trimestral")).toBe("2026-04-30");
  });

  it("Anual soma 12 meses com clamp de 29/fev", () => {
    // 2024 é bissexto, 2025 não: 29/fev -> 28/fev.
    expect(addIntervalClamped("2024-02-29", "Anual")).toBe("2025-02-28");
  });

  it("frequência desconhecida assume Mensal", () => {
    expect(addIntervalClamped("2026-01-15", "Qualquer")).toBe("2026-02-15");
  });
});
