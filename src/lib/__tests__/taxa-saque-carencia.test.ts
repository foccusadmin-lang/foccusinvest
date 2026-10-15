import { describe, it, expect } from "vitest";
import { calcularSaqueCarencia, maximoLiquidoSaqueCarencia } from "@/lib/taxa-saque-carencia";

describe("calcularSaqueCarencia", () => {
  it("soma 15% em cima do valor que o cliente precisa receber (R$ 4.000 -> taxa 600, bruto 4.600)", () => {
    expect(calcularSaqueCarencia(4000)).toEqual({ valorLiquido: 4000, taxa: 600, valorBruto: 4600 });
  });

  it("arredonda pro centavo", () => {
    const r = calcularSaqueCarencia(100.07); // 15% = 15,0105 -> 15,01
    expect(r.taxa).toBe(15.01);
    expect(r.valorBruto).toBe(115.08);
  });
});

describe("maximoLiquidoSaqueCarencia", () => {
  it("nunca deixa o bruto passar do capital", () => {
    for (const capital of [1000, 4705.88, 99.99, 0.5, 52042.76]) {
      const max = maximoLiquidoSaqueCarencia(capital);
      expect(calcularSaqueCarencia(max).valorBruto).toBeLessThanOrEqual(capital + 0.0001);
      // e é o maior possível: mais um centavo já estoura
      expect(calcularSaqueCarencia(max + 0.01).valorBruto).toBeGreaterThan(capital - 0.0001);
    }
  });

  it("capital 4.705,88 -> máximo 4.092,07 (bruto 4.705,88 - taxa 613,81)", () => {
    const max = maximoLiquidoSaqueCarencia(4705.88);
    expect(max).toBeCloseTo(4092.07, 2);
  });
});
