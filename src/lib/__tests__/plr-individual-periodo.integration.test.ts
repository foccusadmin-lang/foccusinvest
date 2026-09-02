import "dotenv/config";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { criarDistribuicao, sincronizarDistribuicoesDoUsuario, SemCapitalElegivelError } from "@/lib/distribuicao";

describe("PLR Individual por período — criarDistribuicao restrita a userIds", () => {
  let adminId: string;
  let selecionadoId: string;
  let naoSelecionadoId: string;
  let distribuicaoIds: string[];
  let estrategiaId: string | null;

  beforeEach(async () => {
    const stamp = `${Date.now()}.${Math.random().toString(36).slice(2)}`;
    const admin = await prisma.user.create({
      data: { email: `teste.plrind.admin.${stamp}@example.com`, name: "Admin", perfil: "ADMIN", statusCadastro: "APROVADO" },
    });
    adminId = admin.id;

    const selecionado = await prisma.user.create({
      data: { email: `teste.plrind.sel.${stamp}@example.com`, name: "Selecionado", perfil: "USUARIO", statusCadastro: "APROVADO" },
    });
    selecionadoId = selecionado.id;
    await prisma.aplicacao.create({
      data: { userId: selecionadoId, valor: 1000, moeda: "BRL", status: "CONFIRMADA", liberaEm: new Date(Date.now() - 86400000) },
    });

    const naoSelecionado = await prisma.user.create({
      data: { email: `teste.plrind.nsel.${stamp}@example.com`, name: "Não selecionado", perfil: "USUARIO", statusCadastro: "APROVADO" },
    });
    naoSelecionadoId = naoSelecionado.id;
    await prisma.aplicacao.create({
      data: { userId: naoSelecionadoId, valor: 2000, moeda: "BRL", status: "CONFIRMADA", liberaEm: new Date(Date.now() - 86400000) },
    });

    distribuicaoIds = [];
    estrategiaId = null;
  });

  afterEach(async () => {
    await prisma.distribuicaoParticipante.deleteMany({ where: { distribuicaoId: { in: distribuicaoIds } } });
    await prisma.creditoCarteira.deleteMany({ where: { userId: { in: [selecionadoId, naoSelecionadoId] } } });
    await prisma.distribuicaoMensal.deleteMany({ where: { id: { in: distribuicaoIds } } });
    if (estrategiaId) {
      await prisma.pontoEstrategia.deleteMany({ where: { estrategiaId } });
      await prisma.estrategiaOperacao.delete({ where: { id: estrategiaId } });
    }
    await prisma.aplicacao.deleteMany({ where: { userId: { in: [selecionadoId, naoSelecionadoId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, selecionadoId, naoSelecionadoId] } } });
  });

  it("cria a Distribuição só para o(s) usuário(s) selecionado(s), não para todo mundo elegível", async () => {
    const hoje = new Date();
    const { distribuicaoId } = await criarDistribuicao({
      criadoPorId: adminId,
      periodoInicio: hoje,
      periodoFim: hoje,
      percentual: 2,
      resultadoApurado: "PLR individual (admin) — teste",
      userIds: [selecionadoId],
    });
    distribuicaoIds.push(distribuicaoId);

    const participantes = await prisma.distribuicaoParticipante.findMany({ where: { distribuicaoId } });
    expect(participantes).toHaveLength(1);
    expect(participantes[0].userId).toBe(selecionadoId);
    expect(participantes[0].valorTotalCota).toBeCloseTo(20, 2); // 1000 * 2%
  });

  it("dilui e credita normalmente pro usuário selecionado (mesma mecânica de uma Distribuição)", async () => {
    const hoje = new Date();
    const { distribuicaoId } = await criarDistribuicao({
      criadoPorId: adminId,
      periodoInicio: hoje,
      periodoFim: hoje,
      percentual: 1,
      resultadoApurado: "PLR individual (admin) — teste",
      userIds: [selecionadoId],
    });
    distribuicaoIds.push(distribuicaoId);

    await prisma.$transaction((tx) => sincronizarDistribuicoesDoUsuario(tx, selecionadoId));

    const creditos = await prisma.creditoCarteira.findMany({ where: { userId: selecionadoId, tipo: "RENDIMENTO" } });
    expect(creditos).toHaveLength(1);
    expect(creditos[0].valor).toBeCloseTo(10, 2); // 1000 * 1%

    // O não-selecionado não recebe nada, mesmo tendo capital elegível.
    const creditosOutro = await prisma.creditoCarteira.findMany({ where: { userId: naoSelecionadoId, tipo: "RENDIMENTO" } });
    expect(creditosOutro).toHaveLength(0);
  });

  it("não sincroniza a Vitrine de Operação quando restrita a userIds (não representa o resultado geral)", async () => {
    const estrategia = await prisma.estrategiaOperacao.create({
      data: { nome: "Teste", moedas: "USD", esperadoMin: 1, esperadoMax: 2, ativa: true },
    });
    estrategiaId = estrategia.id;

    const hoje = new Date();
    const { distribuicaoId } = await criarDistribuicao({
      criadoPorId: adminId,
      periodoInicio: hoje,
      periodoFim: hoje,
      percentual: 5, // bem diferente de qualquer faixa esperada, pra não confundir com coincidência
      resultadoApurado: "PLR individual (admin) — teste",
      userIds: [selecionadoId],
    });
    distribuicaoIds.push(distribuicaoId);

    const pontos = await prisma.pontoEstrategia.findMany({ where: { estrategiaId: estrategia.id } });
    expect(pontos).toHaveLength(0);
  });

  it("uma Distribuição normal (sem userIds) continua sincronizando a Vitrine de Operação normalmente", async () => {
    const estrategia = await prisma.estrategiaOperacao.create({
      data: { nome: "Teste", moedas: "USD", esperadoMin: 1, esperadoMax: 2, ativa: true },
    });
    estrategiaId = estrategia.id;

    const hoje = new Date();
    const { distribuicaoId } = await criarDistribuicao({
      criadoPorId: adminId,
      periodoInicio: hoje,
      periodoFim: hoje,
      percentual: 1.5,
      resultadoApurado: "Resultado do dia — teste normal",
    });
    distribuicaoIds.push(distribuicaoId);

    const pontos = await prisma.pontoEstrategia.findMany({ where: { estrategiaId: estrategia.id } });
    expect(pontos).toHaveLength(1);
    expect(pontos[0].variacaoDia).toBeCloseTo(1.5, 2);
  });

  it("lança erro específico quando nenhum dos selecionados tem capital elegível", async () => {
    const semCapital = await prisma.user.create({
      data: { email: `teste.plrind.semcap.${Date.now()}@example.com`, perfil: "USUARIO", statusCadastro: "APROVADO" },
    });

    await expect(
      criarDistribuicao({
        criadoPorId: adminId,
        periodoInicio: new Date(),
        periodoFim: new Date(),
        percentual: 1,
        resultadoApurado: "PLR individual (admin) — teste",
        userIds: [semCapital.id],
      })
    ).rejects.toThrow(SemCapitalElegivelError);

    await prisma.user.delete({ where: { id: semCapital.id } });
  });
});
