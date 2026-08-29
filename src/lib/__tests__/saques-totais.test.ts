import { describe, it, expect } from "vitest";
import { calcularTotaisSaque } from "@/lib/saques-totais";

describe("calcularTotaisSaque", () => {
  it("separa corretamente rendimento (+ bônus) de capital", () => {
    const totais = calcularTotaisSaque([
      { tipo: "CAPITAL", valor: 1000 },
      { tipo: "CAPITAL", valor: 500 },
      { tipo: "RENDIMENTO", valor: 200 },
      { tipo: "BONUS", valor: 50 },
    ]);

    expect(totais.capital).toBe(1500);
    expect(totais.rendimento).toBe(250);
    expect(totais.geral).toBe(1750);
    expect(totais.quantidade).toBe(4);
  });

  it("devolve zeros pra lista vazia", () => {
    const totais = calcularTotaisSaque([]);
    expect(totais).toEqual({ rendimento: 0, capital: 0, geral: 0, quantidade: 0 });
  });

  it("não soma bônus dentro de capital nem vice-versa", () => {
    const totais = calcularTotaisSaque([
      { tipo: "CAPITAL", valor: 100 },
      { tipo: "BONUS", valor: 100 },
    ]);
    expect(totais.capital).toBe(100);
    expect(totais.rendimento).toBe(100);
  });
});
