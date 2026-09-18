import "dotenv/config";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { contratarServicos, desativarServico } from "@/lib/servicos-contratacao";
import { CARTEIRA_DESTINO_CODIGO } from "@/lib/servicos";

/**
 * Cobre um bug real: contratar "Reaplicação automática" ou "Doar para uma entidade" (Pacotes de
 * Serviços) não travava/liberava nada de verdade — o toggle de reaplicação automática e a
 * doação funcionavam pra QUALQUER usuário mesmo sem contratar o serviço correspondente. Corrigido
 * checando o contrato ATIVO no ponto de execução (não só na tela), igual ao padrão já usado pro
 * Saque de emergência.
 */
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe("Pacotes de Serviços — gating de Reaplicação automática e Doar para entidade", () => {
  let userId: string;
  let empresaUserId: string;
  let inicioDoTeste: Date;

  beforeEach(async () => {
    const stamp = `${Date.now()}.${Math.random().toString(36).slice(2)}`;
    inicioDoTeste = new Date();

    const empresa = await prisma.user.findUniqueOrThrow({
      where: { codigoIndicacao: CARTEIRA_DESTINO_CODIGO },
      select: { id: true },
    });
    empresaUserId = empresa.id;

    const user = await prisma.user.create({
      data: {
        email: `teste.gating.servicos.${stamp}@example.com`,
        name: "Teste Gating Serviços",
        perfil: "USUARIO",
        statusCadastro: "APROVADO",
      },
    });
    userId = user.id;

    await prisma.creditoCarteira.create({
      data: { userId, tipo: "RENDIMENTO", valor: 200, moeda: "BRL", origem: "Teste" },
    });
  });

  afterEach(async () => {
    await prisma.doacao.deleteMany({ where: { doadorId: userId } });
    await prisma.cobrancaServico.deleteMany({ where: { userId } });
    await prisma.contratoServico.deleteMany({ where: { userId } });
    await prisma.aplicacao.deleteMany({ where: { userId } });
    await prisma.aplicacao.deleteMany({
      where: { userId: empresaUserId, origem: "PAGAMENTO_SERVICO", criadoEm: { gte: inicioDoTeste } },
    });
    await prisma.creditoCarteira.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  async function definirReaplicacaoAutomaticaComo(userIdParaSessao: string, ativa: boolean) {
    const { auth } = await import("@/auth");
    const { definirReaplicacaoAutomatica } = await import("@/app/painel/actions");
    // @ts-expect-error — mock simplificado, só o suficiente pro `session?.user?.id` ler.
    vi.mocked(auth).mockResolvedValue({ user: { id: userIdParaSessao } });
    return definirReaplicacaoAutomatica(ativa);
  }

  it("recusa ligar a reaplicação automática sem o serviço contratado", async () => {
    const resultado = await definirReaplicacaoAutomaticaComo(userId, true);
    expect(resultado.error).toMatch(/Reaplicação automática/);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.reaplicacaoAutomatica).toBe(false);
  });

  it("liga a reaplicação automática depois de contratar o serviço", async () => {
    await contratarServicos(userId, ["REAPLICACAO_AUTOMATICA"], "INDIVIDUAL", crypto.randomUUID());

    const resultado = await definirReaplicacaoAutomaticaComo(userId, true);
    expect(resultado.error).toBeUndefined();

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.reaplicacaoAutomatica).toBe(true);
  });

  it("desativar o serviço desliga a flag de reaplicação automática junto", async () => {
    const cobranca = await contratarServicos(userId, ["REAPLICACAO_AUTOMATICA"], "INDIVIDUAL", crypto.randomUUID());
    await definirReaplicacaoAutomaticaComo(userId, true);

    const contrato = await prisma.contratoServico.findFirstOrThrow({
      where: { userId, servico: { codigo: "REAPLICACAO_AUTOMATICA" } },
    });
    expect(cobranca.error).toBeUndefined();

    const resultado = await desativarServico(userId, contrato.servicoId);
    expect(resultado.error).toBeUndefined();

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.reaplicacaoAutomatica).toBe(false);
  });

  it("a execução automática (reaplicarAutomaticamenteSeNecessario) não roda mais depois do serviço ser desativado, mesmo com a flag antiga presa em true", async () => {
    const { reaplicarAutomaticamenteSeNecessario, VALOR_MINIMO_REAPLICACAO } = await import("@/lib/carteira");

    await contratarServicos(userId, ["REAPLICACAO_AUTOMATICA"], "INDIVIDUAL", crypto.randomUUID());
    await definirReaplicacaoAutomaticaComo(userId, true);

    const contrato = await prisma.contratoServico.findFirstOrThrow({
      where: { userId, servico: { codigo: "REAPLICACAO_AUTOMATICA" } },
    });
    await desativarServico(userId, contrato.servicoId);
    // Simula a flag ficando presa em true por algum caminho que não passe por desativarServico.
    await prisma.user.update({ where: { id: userId }, data: { reaplicacaoAutomatica: true } });

    await prisma.creditoCarteira.create({
      data: { userId, tipo: "RENDIMENTO", valor: VALOR_MINIMO_REAPLICACAO + 50, moeda: "BRL", origem: "Teste saldo" },
    });

    await prisma.$transaction((tx) => reaplicarAutomaticamenteSeNecessario(tx, userId));

    const aplicacoes = await prisma.aplicacao.findMany({
      where: { userId, origem: { in: ["REAPLICACAO", "REAPLICACAO_AUTOMATICA"] } },
    });
    expect(aplicacoes.length).toBe(0);
  });

  async function doarComSaldoComo(userIdParaSessao: string, entidadeId: string, valor: string) {
    const { auth } = await import("@/auth");
    const { doarComSaldo } = await import("@/app/painel/doar/actions");
    // @ts-expect-error — mock simplificado, só o suficiente pro `session?.user?.id` ler.
    vi.mocked(auth).mockResolvedValue({ user: { id: userIdParaSessao } });

    const formData = new FormData();
    formData.set("entidadeId", entidadeId);
    formData.set("valor", valor);
    formData.set("anonima", "false");
    return doarComSaldo(undefined, formData);
  }

  it("recusa doar sem o serviço 'Doar para uma entidade' contratado", async () => {
    const resultado = await doarComSaldoComo(userId, "qualquer-id-nao-existe", "50,00");
    expect(resultado?.error).toMatch(/Doar para uma entidade/);
  });

  it("doa com sucesso depois de contratar 'Doar para uma entidade'", async () => {
    const stamp = `${Date.now()}.${Math.random().toString(36).slice(2)}`;
    const entidadeUser = await prisma.user.create({
      data: {
        email: `teste.gating.entidade.${stamp}@example.com`,
        name: "Entidade Teste",
        perfil: "ENTIDADE",
        statusCadastro: "APROVADO",
      },
    });
    const entidade = await prisma.entidade.create({
      data: { userId: entidadeUser.id, tipoEntidade: "ONG", status: "ATIVA", podeReceberDoacao: true },
    });

    await contratarServicos(userId, ["DOAR_ENTIDADE"], "INDIVIDUAL", crypto.randomUUID());

    const resultado = await doarComSaldoComo(userId, entidade.id, "50,00");
    expect(resultado?.error).toBeUndefined();
    expect(resultado?.sucesso).toBeDefined();

    const creditoRecebido = await prisma.aplicacao.findFirst({ where: { userId: entidadeUser.id, origem: "DOACAO" } });
    expect(creditoRecebido?.valor).toBeCloseTo(50, 2);

    await prisma.doacao.deleteMany({ where: { entidadeId: entidade.id } });
    await prisma.aplicacao.deleteMany({ where: { userId: entidadeUser.id } });
    await prisma.entidade.delete({ where: { id: entidade.id } });
    await prisma.user.delete({ where: { id: entidadeUser.id } });
  });
});
