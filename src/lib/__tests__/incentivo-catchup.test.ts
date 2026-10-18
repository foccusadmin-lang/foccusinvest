import { describe, it, expect, vi, beforeEach } from "vitest";

// Nada aqui toca o banco real (os líderes de verdade são creditados por esse fluxo): o prisma é
// substituído por espiões, e o que se verifica é a lógica de dias, marcadores e datas.
const m = vi.hoisted(() => ({
  creditoFindFirst: vi.fn(),
  marcadorCreate: vi.fn(),
  marcadorDeleteMany: vi.fn(),
  userFindMany: vi.fn(),
  aplicacaoGroupBy: vi.fn(),
  creditoCreateMany: vi.fn(),
  logCreate: vi.fn(),
  config: { modoIncentivoLideranca: "AUTOMATICO" as "AUTOMATICO" | "MANUAL" },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    creditoCarteira: { findFirst: m.creditoFindFirst, createMany: m.creditoCreateMany },
    liberacaoIncentivoDiaria: { create: m.marcadorCreate, deleteMany: m.marcadorDeleteMany },
    user: { findMany: m.userFindMany },
    aplicacao: { groupBy: m.aplicacaoGroupBy },
    logAuditoria: { create: m.logCreate },
  },
}));
vi.mock("@/lib/configuracao", () => ({ getConfiguracao: async () => m.config }));

import {
  diasUteisParaCatchup,
  liberarIncentivoDoDia,
  liberarIncentivoAutomaticoSeNecessario,
  CATCHUP_INCENTIVO_A_PARTIR_DE,
} from "@/lib/incentivo-lideranca";

beforeEach(() => {
  vi.clearAllMocks();
  m.config.modoIncentivoLideranca = "AUTOMATICO";
  m.creditoFindFirst.mockResolvedValue(null);
  m.marcadorCreate.mockResolvedValue({});
  m.userFindMany.mockResolvedValue([{ id: "l1" }, { id: "l2" }]);
  m.aplicacaoGroupBy.mockResolvedValue([
    { userId: "l1", _sum: { valor: 10000 } },
    { userId: "l2", _sum: { valor: 5000 } },
  ]);
});

describe("diasUteisParaCatchup", () => {
  it("ignora fim de semana e respeita o piso", () => {
    // Hoje é terça 20/10/2026; piso 19/10 → só segunda 19/10.
    expect(diasUteisParaCatchup("2026-10-20", "2026-10-19", 7)).toEqual(["2026-10-19"]);
    // Sem piso relevante: de sexta 16 a segunda 19 (sáb/dom fora), do mais antigo ao mais novo.
    expect(diasUteisParaCatchup("2026-10-20", "2026-10-01", 4)).toEqual(["2026-10-16", "2026-10-19"]);
  });

  it("o piso padrão não deixa o deploy pagar os dias já perdidos (06/10, 09/10, 12/10, 16/10)", () => {
    const dias = diasUteisParaCatchup("2026-10-19", CATCHUP_INCENTIVO_A_PARTIR_DE, 7);
    expect(dias).toEqual([]);
  });

  it("limita a janela a `max` dias pra trás", () => {
    expect(diasUteisParaCatchup("2026-10-30", "2026-01-01", 3)).toEqual(["2026-10-27", "2026-10-28", "2026-10-29"]);
  });
});

describe("liberarIncentivoDoDia", () => {
  it("credita 0,10% do capital de cada líder, com a data das 19h daquele dia, e registra o marcador", async () => {
    const r = await liberarIncentivoDoDia("2026-10-16");
    expect(r.creditados).toBe(2);
    expect(r.total).toBeCloseTo(15, 5); // 0,1% de 10000 + 0,1% de 5000

    expect(m.marcadorCreate).toHaveBeenCalledWith({ data: { dia: new Date("2026-10-16T00:00:00-03:00") } });
    const dados = m.creditoCreateMany.mock.calls[0][0].data;
    expect(dados).toHaveLength(2);
    expect(dados[0].criadoEm.toISOString()).toBe(new Date("2026-10-16T19:00:00-03:00").toISOString());
    expect(dados[0].origem).toBe("Incentivo de liderança 0.1% (automático)");
    expect(dados[0].valor).toBeCloseTo(10, 5);
  });

  it("não duplica: se o dia já foi liberado, não credita de novo", async () => {
    m.creditoFindFirst.mockResolvedValue({ id: "x" });
    const r = await liberarIncentivoDoDia("2026-10-16");
    expect(r.creditados).toBe(0);
    expect(m.creditoCreateMany).not.toHaveBeenCalled();
  });

  it("não duplica em corrida: marcador já reivindicado por outra chamada (P2002)", async () => {
    m.marcadorCreate.mockRejectedValue({ code: "P2002" });
    const r = await liberarIncentivoDoDia("2026-10-16");
    expect(r.creditados).toBe(0);
    expect(m.creditoCreateMany).not.toHaveBeenCalled();
  });

  it("se falhar depois de reivindicar, desfaz o marcador (o dia pode ser tentado de novo)", async () => {
    m.creditoCreateMany.mockRejectedValue(new Error("banco caiu"));
    await expect(liberarIncentivoDoDia("2026-10-16")).rejects.toThrow("banco caiu");
    expect(m.marcadorDeleteMany).toHaveBeenCalledWith({ where: { dia: new Date("2026-10-16T00:00:00-03:00") } });
  });
});

describe("liberarIncentivoAutomaticoSeNecessario", () => {
  it("modo manual: não faz nada", async () => {
    m.config.modoIncentivoLideranca = "MANUAL";
    const r = await liberarIncentivoAutomaticoSeNecessario();
    expect(r.pulou).toBe("modo manual");
    expect(m.marcadorCreate).not.toHaveBeenCalled();
  });
});
