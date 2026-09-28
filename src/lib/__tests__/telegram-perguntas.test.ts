import { describe, it, expect } from "vitest";
import { normalizar, periodoDaPergunta } from "@/lib/telegram-perguntas";

describe("normalizar", () => {
  it("remove acentos e caixa alta", () => {
    expect(normalizar("Quanto ENTROU esse MÊS?")).toBe("quanto entrou esse mes?");
  });
});

describe("periodoDaPergunta", () => {
  // Uma terça-feira, bem no meio do dia (horário de Brasília).
  const agora = new Date("2026-09-22T15:00:00-03:00");

  it("sem palavra de período, assume hoje (fim = agora)", () => {
    const p = periodoDaPergunta(normalizar("quanto entrou"), agora);
    expect(p.rotulo).toBe("hoje");
    expect(p.inicio.toISOString().slice(0, 10)).toBe("2026-09-22");
    expect(p.fim.getTime()).toBe(agora.getTime());
  });

  it("\"ontem\" usa o dia anterior inteiro (Brasília)", () => {
    const p = periodoDaPergunta(normalizar("quanto saiu ontem"), agora);
    expect(p.rotulo).toBe("ontem");
    const dataBrasilia = (d: Date) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
    expect(dataBrasilia(p.inicio)).toBe("2026-09-21");
    expect(dataBrasilia(p.fim)).toBe("2026-09-21");
    expect(p.fim.getTime()).toBeGreaterThan(p.inicio.getTime());
  });

  it("\"semana\" começa na segunda-feira", () => {
    const p = periodoDaPergunta(normalizar("resumo da semana"), agora);
    expect(p.rotulo).toBe("essa semana");
    // 2026-09-22 é terça; a segunda daquela semana é 2026-09-21.
    expect(p.inicio.toISOString().slice(0, 10)).toBe("2026-09-21");
    expect(p.fim.getTime()).toBe(agora.getTime());
  });

  it("\"mês\" (sem acento após normalizar) começa no dia 1", () => {
    const p = periodoDaPergunta(normalizar("quanto entrou esse mês"), agora);
    expect(p.rotulo).toBe("esse mês");
    expect(p.inicio.toISOString().slice(0, 10)).toBe("2026-09-01");
  });
});
