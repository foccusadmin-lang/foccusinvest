import "dotenv/config";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { reaplicarAutomaticamenteSeNecessario, VALOR_MINIMO_REAPLICACAO } from "@/lib/carteira";

/** Testes de integração contra o banco de desenvolvimento real, com conta descartável criada e
 *  apagada a cada teste (mesmo padrão dos demais testes de integração deste projeto). */
describe("reaplicarAutomaticamenteSeNecessario", () => {
  let userId: string;

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: {
        email: `teste.reaplicauto.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`,
        name: "Teste Reaplicação Automática",
        perfil: "USUARIO",
        statusCadastro: "APROVADO",
      },
    });
    userId = user.id;
  });

  afterEach(async () => {
    await prisma.aplicacao.deleteMany({ where: { userId } });
    await prisma.creditoCarteira.deleteMany({ where: { userId } });
    await prisma.logAuditoria.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it("não faz nada se o investidor não ligou a opção, mesmo com saldo suficiente", async () => {
    await prisma.creditoCarteira.create({
      data: { userId, tipo: "RENDIMENTO", valor: VALOR_MINIMO_REAPLICACAO + 50, moeda: "BRL", origem: "Teste" },
    });

    await prisma.$transaction((tx) => reaplicarAutomaticamenteSeNecessario(tx, userId));

    const aplicacoes = await prisma.aplicacao.findMany({ where: { userId, origem: "REAPLICACAO" } });
    expect(aplicacoes.length).toBe(0);
  });

  it("não faz nada se o saldo ainda não bateu o mínimo, mesmo com a opção ligada", async () => {
    await prisma.user.update({ where: { id: userId }, data: { reaplicacaoAutomatica: true } });
    await prisma.creditoCarteira.create({
      data: { userId, tipo: "RENDIMENTO", valor: VALOR_MINIMO_REAPLICACAO - 10, moeda: "BRL", origem: "Teste" },
    });

    await prisma.$transaction((tx) => reaplicarAutomaticamenteSeNecessario(tx, userId));

    const aplicacoes = await prisma.aplicacao.findMany({ where: { userId, origem: "REAPLICACAO" } });
    expect(aplicacoes.length).toBe(0);
  });

  it("reaplica sozinho o saldo (rendimento + bônus) quando a opção está ligada e o mínimo foi atingido", async () => {
    await prisma.user.update({ where: { id: userId }, data: { reaplicacaoAutomatica: true } });
    await prisma.creditoCarteira.create({
      data: { userId, tipo: "RENDIMENTO", valor: 80, moeda: "BRL", origem: "Teste rendimento" },
    });
    await prisma.creditoCarteira.create({
      data: { userId, tipo: "BONUS", valor: 30, moeda: "BRL", origem: "Teste bônus" },
    });

    await prisma.$transaction((tx) => reaplicarAutomaticamenteSeNecessario(tx, userId));

    const aplicacoes = await prisma.aplicacao.findMany({ where: { userId, origem: "REAPLICACAO" } });
    expect(aplicacoes.length).toBe(1);
    expect(aplicacoes[0].valor).toBeCloseTo(110, 2);
    expect(aplicacoes[0].status).toBe("CONFIRMADA");

    const creditos = await prisma.creditoCarteira.findMany({ where: { userId } });
    expect(creditos.every((c) => c.utilizadoEm !== null)).toBe(true);

    const log = await prisma.logAuditoria.findFirst({ where: { userId, acao: "reaplicacao_automatica" } });
    expect(log).not.toBeNull();
  });

  it("não reaplica duas vezes o mesmo saldo já usado numa chamada anterior", async () => {
    await prisma.user.update({ where: { id: userId }, data: { reaplicacaoAutomatica: true } });
    await prisma.creditoCarteira.create({
      data: { userId, tipo: "RENDIMENTO", valor: 150, moeda: "BRL", origem: "Teste" },
    });

    await prisma.$transaction((tx) => reaplicarAutomaticamenteSeNecessario(tx, userId));
    await prisma.$transaction((tx) => reaplicarAutomaticamenteSeNecessario(tx, userId));

    const aplicacoes = await prisma.aplicacao.findMany({ where: { userId, origem: "REAPLICACAO" } });
    expect(aplicacoes.length).toBe(1);
  });
});
