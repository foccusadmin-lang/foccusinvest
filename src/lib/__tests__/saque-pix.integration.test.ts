import "dotenv/config";
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

/**
 * Testes de integração — rodam contra o banco de desenvolvimento real (mesmo padrão usado nos
 * demais scripts de verificação deste projeto), sempre com contas/registros descartáveis
 * (`teste.*@example.com`) criados e apagados dentro do próprio teste. Nunca tocam em dados
 * reais de investidor.
 */

vi.mock("@/auth", () => ({ auth: vi.fn() }));

describe("Bloqueio de usuário sem permissão", () => {
  it("aprovarSaque/recusarSaque/marcarSaquePago rejeitam quem não é ADMIN", async () => {
    const { auth } = await import("@/auth");
    const { aprovarSaque, recusarSaque, marcarSaquePago } = await import(
      "@/app/restrito/saques/actions"
    );

    // @ts-expect-error — mock simplificado, só o suficiente pro `session?.user?.perfil` ler.
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-comum", perfil: "USUARIO" } });

    await expect(aprovarSaque("qualquer-id")).rejects.toThrow(/acesso negado/i);
    await expect(recusarSaque("qualquer-id", "motivo qualquer")).rejects.toThrow(/acesso negado/i);
    await expect(marcarSaquePago("qualquer-id")).rejects.toThrow(/acesso negado/i);
  });

  it("também rejeita quando não há sessão nenhuma", async () => {
    const { auth } = await import("@/auth");
    const { aprovarSaque } = await import("@/app/restrito/saques/actions");

    // @ts-expect-error — mock simplificado.
    vi.mocked(auth).mockResolvedValue(null);

    await expect(aprovarSaque("qualquer-id")).rejects.toThrow(/acesso negado/i);
  });
});

describe("Bloqueio de solicitação duplicada (idempotência)", () => {
  const stamp = Date.now();
  const userId1 = `teste-idemp-1-${stamp}`;
  const userId2 = `teste-idemp-2-${stamp}`;
  const idempotencyKey = `teste-idem-key-${stamp}`;

  beforeAll(async () => {
    await prisma.user.create({
      data: {
        id: userId1,
        email: `teste.idemp1.${stamp}@example.com`,
        name: "Teste Idempotência 1",
        perfil: "USUARIO",
        statusCadastro: "APROVADO",
      },
    });
    await prisma.user.create({
      data: {
        id: userId2,
        email: `teste.idemp2.${stamp}@example.com`,
        name: "Teste Idempotência 2",
        perfil: "USUARIO",
        statusCadastro: "APROVADO",
      },
    });
  });

  afterAll(async () => {
    await prisma.solicitacaoSaque.deleteMany({ where: { userId: { in: [userId1, userId2] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userId1, userId2] } } });
    await prisma.$disconnect();
  });

  it("o índice único de idempotencyKey rejeita uma segunda solicitação com a mesma chave", async () => {
    await prisma.solicitacaoSaque.create({
      data: { userId: userId1, tipo: "CAPITAL", valor: 100, moeda: "BRL", idempotencyKey },
    });

    await expect(
      prisma.solicitacaoSaque.create({
        data: { userId: userId2, tipo: "CAPITAL", valor: 999, moeda: "BRL", idempotencyKey },
      })
    ).rejects.toMatchObject({ code: "P2002" });

    // Confirma que só UMA solicitação foi criada de verdade — a segunda tentativa não deixou
    // nenhum resíduo no banco.
    const total = await prisma.solicitacaoSaque.count({ where: { idempotencyKey } });
    expect(total).toBe(1);
  });

  it("chaves de idempotência diferentes criam solicitações normalmente, sem conflito", async () => {
    const chaveA = `${idempotencyKey}-a`;
    const chaveB = `${idempotencyKey}-b`;
    await prisma.solicitacaoSaque.create({
      data: { userId: userId1, tipo: "CAPITAL", valor: 50, moeda: "BRL", idempotencyKey: chaveA },
    });
    await prisma.solicitacaoSaque.create({
      data: { userId: userId1, tipo: "CAPITAL", valor: 75, moeda: "BRL", idempotencyKey: chaveB },
    });
    const total = await prisma.solicitacaoSaque.count({
      where: { idempotencyKey: { in: [chaveA, chaveB] } },
    });
    expect(total).toBe(2);
  });
});
