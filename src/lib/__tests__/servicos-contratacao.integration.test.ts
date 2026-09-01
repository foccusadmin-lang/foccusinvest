import "dotenv/config";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { contratarServicos, usuarioTemServicoAtivo } from "@/lib/servicos-contratacao";
import { criarLiberacaoEmergencial } from "@/lib/emergencia";
import { CARTEIRA_DESTINO_CODIGO } from "@/lib/servicos";

describe("Pacotes de Serviços — contratação e gating do Saque de emergência", () => {
  let userId: string;
  let empresaUserId: string;
  let inicioDoTeste: Date;

  beforeEach(async () => {
    const stamp = `${Date.now()}.${Math.random().toString(36).slice(2)}`;
    inicioDoTeste = new Date();

    // Conta destino real já existente na plataforma (Grupo WD, código 2VPDV-GRUPO) — nunca
    // criada nem apagada aqui, só localizada. A limpeza abaixo só remove os lançamentos que
    // ESTE teste criou nela (por origem + criadoEm >= início do teste), nunca dados anteriores.
    const empresa = await prisma.user.findUniqueOrThrow({
      where: { codigoIndicacao: CARTEIRA_DESTINO_CODIGO },
      select: { id: true },
    });
    empresaUserId = empresa.id;

    const user = await prisma.user.create({
      data: {
        email: `teste.servicos.${stamp}@example.com`,
        name: "Teste Serviços",
        perfil: "USUARIO",
        statusCadastro: "APROVADO",
      },
    });
    userId = user.id;

    // Rendimento disponível suficiente pra cobrir a tarifa avulsa (R$ 6,58).
    await prisma.creditoCarteira.create({
      data: { userId, tipo: "RENDIMENTO", valor: 20, moeda: "BRL", origem: "Teste" },
    });
  });

  afterEach(async () => {
    await prisma.cobrancaServico.deleteMany({ where: { userId } });
    await prisma.contratoServico.deleteMany({ where: { userId } });
    await prisma.aplicacao.deleteMany({ where: { userId } });
    // Na conta destino (real, compartilhada), só apaga o que este teste criou.
    await prisma.aplicacao.deleteMany({
      where: { userId: empresaUserId, origem: "PAGAMENTO_SERVICO", criadoEm: { gte: inicioDoTeste } },
    });
    await prisma.creditoCarteira.deleteMany({ where: { userId } });
    await prisma.liberacaoEmergencial.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("contrata o Saque de emergência avulso debitando do rendimento e credita a carteira destino", async () => {
    const resultado = await contratarServicos(userId, ["SAQUE_EMERGENCIA"], "INDIVIDUAL", crypto.randomUUID());
    expect(resultado.error).toBeUndefined();
    expect(resultado.cobrancaId).toBeDefined();

    const cobranca = await prisma.cobrancaServico.findUnique({ where: { id: resultado.cobrancaId! } });
    expect(cobranca?.valorFinal).toBeCloseTo(6.58, 2);
    expect(cobranca?.percentualDesconto).toBe(0); // avulso não tem desconto de pacote
    expect(cobranca?.origemRendimento).toBeCloseTo(6.58, 2);

    const ativo = await usuarioTemServicoAtivo(userId, "SAQUE_EMERGENCIA");
    expect(ativo).toBe(true);

    const credito = await prisma.aplicacao.findFirst({
      where: { userId: empresaUserId, origem: "PAGAMENTO_SERVICO", criadoEm: { gte: inicioDoTeste } },
    });
    expect(credito?.valor).toBeCloseTo(6.58, 2);
  });

  it("é idempotente: reenviar a mesma idempotencyKey não cobra duas vezes", async () => {
    const chave = crypto.randomUUID();
    const primeira = await contratarServicos(userId, ["SAQUE_EMERGENCIA"], "INDIVIDUAL", chave);
    const segunda = await contratarServicos(userId, ["SAQUE_EMERGENCIA"], "INDIVIDUAL", chave);
    expect(segunda.cobrancaId).toBe(primeira.cobrancaId);

    const cobrancas = await prisma.cobrancaServico.count({ where: { userId } });
    expect(cobrancas).toBe(1);
  });

  it("admin não consegue liberar saque de emergência sem o serviço ATIVO", async () => {
    const aplicacao = await prisma.aplicacao.create({
      data: { userId, valor: 1000, moeda: "BRL", status: "CONFIRMADA", liberaEm: new Date(Date.now() + 86400000) },
    });

    const resultado = await criarLiberacaoEmergencial({
      aplicacaoId: aplicacao.id,
      adminId: empresaUserId, // qualquer id válido de "admin" pra esse teste
      valorMaximo: 100,
      tipoSaque: "PARCIAL",
      expiraEm: new Date(Date.now() + 86400000),
      motivo: "Motivo de teste com mais de 10 caracteres.",
      ip: null,
    });

    expect(resultado.error).toMatch(/Saque de emergência/);
    expect(resultado.liberacaoId).toBeUndefined();
  });

  it("admin consegue liberar depois que o serviço fica ATIVO", async () => {
    await contratarServicos(userId, ["SAQUE_EMERGENCIA"], "INDIVIDUAL", crypto.randomUUID());

    const aplicacao = await prisma.aplicacao.create({
      data: { userId, valor: 1000, moeda: "BRL", status: "CONFIRMADA", liberaEm: new Date(Date.now() + 86400000) },
    });

    const resultado = await criarLiberacaoEmergencial({
      aplicacaoId: aplicacao.id,
      adminId: empresaUserId,
      valorMaximo: 100,
      tipoSaque: "PARCIAL",
      expiraEm: new Date(Date.now() + 86400000),
      motivo: "Motivo de teste com mais de 10 caracteres.",
      ip: null,
    });

    expect(resultado.error).toBeUndefined();
    expect(resultado.liberacaoId).toBeDefined();

    await prisma.liberacaoEmergencial.deleteMany({ where: { id: resultado.liberacaoId } });
  });

  it("recusa contratar de novo um serviço já ATIVO", async () => {
    await contratarServicos(userId, ["SAQUE_EMERGENCIA"], "INDIVIDUAL", crypto.randomUUID());
    const segunda = await contratarServicos(userId, ["SAQUE_EMERGENCIA"], "INDIVIDUAL", crypto.randomUUID());
    expect(segunda.error).toMatch(/já está contratado/);
  });
});
