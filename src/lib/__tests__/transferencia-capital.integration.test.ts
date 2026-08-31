import "dotenv/config";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { transferirCapitalEntreUsuarios, SaldoInsuficienteError } from "@/lib/carteira";

describe("transferirCapitalEntreUsuarios", () => {
  let origemId: string;
  let destinoId: string;

  beforeEach(async () => {
    const stamp = `${Date.now()}.${Math.random().toString(36).slice(2)}`;
    const origem = await prisma.user.create({
      data: {
        email: `teste.transf.origem.${stamp}@example.com`,
        name: "Teste Origem",
        perfil: "USUARIO",
        statusCadastro: "APROVADO",
      },
    });
    const destino = await prisma.user.create({
      data: {
        email: `teste.transf.destino.${stamp}@example.com`,
        name: "Teste Destino",
        perfil: "USUARIO",
        statusCadastro: "APROVADO",
      },
    });
    origemId = origem.id;
    destinoId = destino.id;

    await prisma.aplicacao.create({
      data: {
        userId: origemId,
        valor: 500,
        moeda: "BRL",
        status: "CONFIRMADA",
        liberaEm: new Date(Date.now() + 86400000),
      },
    });
  });

  afterEach(async () => {
    await prisma.aplicacao.deleteMany({ where: { userId: { in: [origemId, destinoId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [origemId, destinoId] } } });
  });

  it("move o valor da origem pro destino, criando um lote novo com carência de 90 dias", async () => {
    await prisma.$transaction((tx) => transferirCapitalEntreUsuarios(tx, origemId, destinoId, 200));

    const capitalOrigem = await prisma.aplicacao.aggregate({
      where: { userId: origemId, status: "CONFIRMADA" },
      _sum: { valor: true },
    });
    const capitalDestino = await prisma.aplicacao.findFirst({
      where: { userId: destinoId, origem: "TRANSFERENCIA" },
    });

    expect(capitalOrigem._sum.valor).toBeCloseTo(300, 2);
    expect(capitalDestino).not.toBeNull();
    expect(capitalDestino!.valor).toBeCloseTo(200, 2);
    expect(capitalDestino!.status).toBe("CONFIRMADA");

    const noventaDias = 90 * 24 * 60 * 60 * 1000;
    const diferenca = capitalDestino!.liberaEm.getTime() - Date.now();
    expect(diferenca).toBeGreaterThan(noventaDias - 60_000);
    expect(diferenca).toBeLessThan(noventaDias + 60_000);
  });

  it("rejeita transferir mais do que a origem tem de capital livre", async () => {
    await expect(
      prisma.$transaction((tx) => transferirCapitalEntreUsuarios(tx, origemId, destinoId, 999))
    ).rejects.toThrow(SaldoInsuficienteError);

    // Nada deve ter sido alterado — a transação inteira reverte.
    const capitalOrigem = await prisma.aplicacao.aggregate({
      where: { userId: origemId, status: "CONFIRMADA" },
      _sum: { valor: true },
    });
    expect(capitalOrigem._sum.valor).toBeCloseTo(500, 2);
    const destino = await prisma.aplicacao.findFirst({ where: { userId: destinoId } });
    expect(destino).toBeNull();
  });

  it("rejeita origem e destino iguais", async () => {
    await expect(
      prisma.$transaction((tx) => transferirCapitalEntreUsuarios(tx, origemId, origemId, 100))
    ).rejects.toThrow(/mesmo investidor/i);
  });
});
