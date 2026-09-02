import "dotenv/config";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  criarCampanhaPlrAutomatica,
  desativarCampanhaPlrAutomatica,
  processarDiasPendentes,
} from "@/lib/plr-automatico";
import { sincronizarDistribuicoesDoUsuario } from "@/lib/distribuicao";

describe("PLR automático — campanha e motor de processamento", () => {
  let adminId: string;
  let investidorId: string;
  let campanhaIds: string[];
  let distribuicaoIds: string[];

  beforeEach(async () => {
    const stamp = `${Date.now()}.${Math.random().toString(36).slice(2)}`;
    const admin = await prisma.user.create({
      data: { email: `teste.plr.admin.${stamp}@example.com`, name: "Admin", perfil: "ADMIN", statusCadastro: "APROVADO" },
    });
    adminId = admin.id;

    const investidor = await prisma.user.create({
      data: { email: `teste.plr.investidor.${stamp}@example.com`, name: "Investidor", perfil: "USUARIO", statusCadastro: "APROVADO" },
    });
    investidorId = investidor.id;
    await prisma.aplicacao.create({
      data: { userId: investidorId, valor: 1000, moeda: "BRL", status: "CONFIRMADA", liberaEm: new Date(Date.now() - 86400000) },
    });

    campanhaIds = [];
    distribuicaoIds = [];
  });

  afterEach(async () => {
    await prisma.distribuicaoParticipante.deleteMany({ where: { distribuicaoId: { in: distribuicaoIds } } });
    await prisma.campanhaPlrDia.deleteMany({ where: { campanhaId: { in: campanhaIds } } });
    await prisma.campanhaPlrAutomatica.deleteMany({ where: { id: { in: campanhaIds } } });
    await prisma.distribuicaoMensal.deleteMany({ where: { id: { in: distribuicaoIds } } });
    await prisma.creditoCarteira.deleteMany({ where: { userId: investidorId } });
    await prisma.aplicacao.deleteMany({ where: { userId: investidorId } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, investidorId] } } });
  });

  it("cria a campanha com o cronograma diário já gravado, somando exatamente o percentual total", async () => {
    const inicio = new Date(Date.now() - 4 * 86400000);
    const fim = new Date(Date.now() + 2 * 86400000);

    const resultado = await criarCampanhaPlrAutomatica({
      percentualTotal: 3,
      periodoInicio: inicio,
      periodoFim: fim,
      horarioLancamento: "00:00",
      criadoPorId: adminId,
    });
    expect(resultado.error).toBeUndefined();
    campanhaIds.push(resultado.campanhaId!);

    const dias = await prisma.campanhaPlrDia.findMany({ where: { campanhaId: resultado.campanhaId! } });
    expect(dias).toHaveLength(7);
    const soma = dias.reduce((acc, d) => acc + d.percentual, 0);
    expect(soma).toBeCloseTo(3, 2);
    expect(dias.every((d) => d.processadoEm === null)).toBe(true);
  });

  it("criar uma nova campanha desativa a anterior automaticamente", async () => {
    const hoje = new Date();
    const r1 = await criarCampanhaPlrAutomatica({
      percentualTotal: 2,
      periodoInicio: hoje,
      periodoFim: new Date(hoje.getTime() + 86400000),
      horarioLancamento: "00:00",
      criadoPorId: adminId,
    });
    campanhaIds.push(r1.campanhaId!);

    const r2 = await criarCampanhaPlrAutomatica({
      percentualTotal: 4,
      periodoInicio: hoje,
      periodoFim: new Date(hoje.getTime() + 86400000),
      horarioLancamento: "00:00",
      criadoPorId: adminId,
    });
    campanhaIds.push(r2.campanhaId!);

    const c1 = await prisma.campanhaPlrAutomatica.findUnique({ where: { id: r1.campanhaId! } });
    const c2 = await prisma.campanhaPlrAutomatica.findUnique({ where: { id: r2.campanhaId! } });
    expect(c1?.ativa).toBe(false);
    expect(c2?.ativa).toBe(true);
  });

  it("processarDiasPendentes materializa (cria Distribuição) só o que já chegou e cujo horário já passou, e credita o investidor", async () => {
    const ontem = new Date(Date.now() - 86400000);
    const amanha = new Date(Date.now() + 86400000);

    const resultado = await criarCampanhaPlrAutomatica({
      percentualTotal: 2,
      periodoInicio: ontem,
      periodoFim: amanha,
      horarioLancamento: "00:00", // já passou, qualquer hora do dia
      criadoPorId: adminId,
    });
    campanhaIds.push(resultado.campanhaId!);

    const { processados, erros } = await processarDiasPendentes();
    expect(erros).toEqual([]);
    expect(processados).toBeGreaterThanOrEqual(2); // ontem e hoje (não amanhã, ainda não chegou)

    const diasAtualizados = await prisma.campanhaPlrDia.findMany({
      where: { campanhaId: resultado.campanhaId! },
      orderBy: { data: "asc" },
    });
    // Coleta as Distribuições geradas pra limpar depois.
    for (const d of diasAtualizados) if (d.distribuicaoId) distribuicaoIds.push(d.distribuicaoId);

    const diaDeAmanha = diasAtualizados.find((d) => d.data.getTime() === new Date(amanha.toISOString().slice(0, 10)).getTime());
    expect(diaDeAmanha?.processadoEm ?? null).toBeNull();

    const diaDeOntem = diasAtualizados.find((d) => d.data <= ontem);
    expect(diaDeOntem?.processadoEm).not.toBeNull();
    expect(diaDeOntem?.distribuicaoId).not.toBeNull();

    // A Distribuição foi criada, mas o crédito em si só materializa quando a carteira do
    // investidor é sincronizada (lazy, no load do painel, ou pelo cron diário existente de
    // sincronizar-distribuicoes) — mesmo comportamento de uma Distribuição lançada manualmente.
    await prisma.$transaction((tx) => sincronizarDistribuicoesDoUsuario(tx, investidorId));
    const creditos = await prisma.creditoCarteira.findMany({ where: { userId: investidorId, tipo: "RENDIMENTO" } });
    expect(creditos.length).toBeGreaterThan(0);
  });

  it("rodar processarDiasPendentes duas vezes não duplica a Distribuição do mesmo dia (idempotência)", async () => {
    const hoje = new Date();
    const resultado = await criarCampanhaPlrAutomatica({
      percentualTotal: 1,
      periodoInicio: hoje,
      periodoFim: hoje,
      horarioLancamento: "00:00",
      criadoPorId: adminId,
    });
    campanhaIds.push(resultado.campanhaId!);

    await processarDiasPendentes();
    await processarDiasPendentes();

    const dias = await prisma.campanhaPlrDia.findMany({ where: { campanhaId: resultado.campanhaId! } });
    for (const d of dias) if (d.distribuicaoId) distribuicaoIds.push(d.distribuicaoId);

    const totalDistribuicoes = await prisma.distribuicaoMensal.count({
      where: { id: { in: distribuicaoIds } },
    });
    expect(totalDistribuicoes).toBe(1);
  });

  it("não materializa nada antes do horário configurado chegar", async () => {
    const agora = new Date();
    const horaFutura = new Date(agora.getTime() + 2 * 60 * 60 * 1000); // 2h à frente
    const horarioTexto = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(horaFutura);

    const resultado = await criarCampanhaPlrAutomatica({
      percentualTotal: 1,
      periodoInicio: agora,
      periodoFim: agora,
      horarioLancamento: horarioTexto,
      criadoPorId: adminId,
    });
    campanhaIds.push(resultado.campanhaId!);

    const { processados } = await processarDiasPendentes();
    expect(processados).toBe(0);

    const dia = await prisma.campanhaPlrDia.findFirstOrThrow({ where: { campanhaId: resultado.campanhaId! } });
    expect(dia.processadoEm).toBeNull();
  });

  it("desativarCampanhaPlrAutomatica impede que o motor continue processando os dias pendentes dela", async () => {
    const hoje = new Date();
    const resultado = await criarCampanhaPlrAutomatica({
      percentualTotal: 1,
      periodoInicio: hoje,
      periodoFim: hoje,
      horarioLancamento: "00:00",
      criadoPorId: adminId,
    });
    campanhaIds.push(resultado.campanhaId!);

    await desativarCampanhaPlrAutomatica(resultado.campanhaId!);
    const { processados } = await processarDiasPendentes();
    expect(processados).toBe(0);
  });

  it("duas rodadas do cron ao mesmo tempo (concorrência) não duplicam a Distribuição do mesmo dia", async () => {
    const hoje = new Date();
    const resultado = await criarCampanhaPlrAutomatica({
      percentualTotal: 1,
      periodoInicio: hoje,
      periodoFim: hoje,
      horarioLancamento: "00:00",
      criadoPorId: adminId,
    });
    campanhaIds.push(resultado.campanhaId!);

    // Duas chamadas disparadas juntas, simulando o cron rodando em paralelo.
    const [r1, r2] = await Promise.all([processarDiasPendentes(), processarDiasPendentes()]);
    expect(r1.processados + r2.processados).toBe(1); // só uma das duas de fato criou

    const dias = await prisma.campanhaPlrDia.findMany({ where: { campanhaId: resultado.campanhaId! } });
    for (const d of dias) if (d.distribuicaoId) distribuicaoIds.push(d.distribuicaoId);

    const totalDistribuicoes = await prisma.distribuicaoMensal.count({ where: { id: { in: distribuicaoIds } } });
    expect(totalDistribuicoes).toBe(1);
  });

  it("recusa criar uma campanha cujo período sobrepõe dias já lançados por outra campanha", async () => {
    const hoje = new Date();
    const r1 = await criarCampanhaPlrAutomatica({
      percentualTotal: 1,
      periodoInicio: hoje,
      periodoFim: hoje,
      horarioLancamento: "00:00",
      criadoPorId: adminId,
    });
    campanhaIds.push(r1.campanhaId!);
    await processarDiasPendentes(); // materializa o dia — agora está "já lançado"

    const diasProcessados = await prisma.campanhaPlrDia.findMany({ where: { campanhaId: r1.campanhaId! } });
    for (const d of diasProcessados) if (d.distribuicaoId) distribuicaoIds.push(d.distribuicaoId);

    const r2 = await criarCampanhaPlrAutomatica({
      percentualTotal: 2,
      periodoInicio: hoje,
      periodoFim: hoje,
      horarioLancamento: "10:00",
      criadoPorId: adminId,
    });
    expect(r2.error).toBeDefined();
    expect(r2.campanhaId).toBeUndefined();
  });

  it("permite criar uma campanha sobreposta a outra que ainda não chegou a lançar nenhum dia (correção antes de rodar)", async () => {
    const amanha = new Date(Date.now() + 86400000);
    const r1 = await criarCampanhaPlrAutomatica({
      percentualTotal: 1,
      periodoInicio: amanha,
      periodoFim: amanha,
      horarioLancamento: "00:00",
      criadoPorId: adminId,
    });
    campanhaIds.push(r1.campanhaId!);
    // Não roda processarDiasPendentes — nada foi lançado ainda (a data é amanhã).

    const r2 = await criarCampanhaPlrAutomatica({
      percentualTotal: 3,
      periodoInicio: amanha,
      periodoFim: amanha,
      horarioLancamento: "00:00",
      criadoPorId: adminId,
    });
    expect(r2.error).toBeUndefined();
    campanhaIds.push(r2.campanhaId!);
  });

  it("se já existir uma Distribuição 'PLR automático' pra data (estado legado inconsistente), reaproveita em vez de duplicar", async () => {
    const hoje = new Date();

    // Simula um estado inconsistente pré-existente: uma Distribuição "PLR automático" pra hoje,
    // sem vínculo com nenhuma campanha (como se tivesse sobrado de uma versão anterior do motor).
    const distribuicaoExistente = await prisma.distribuicaoMensal.create({
      data: {
        periodoInicio: hoje,
        periodoFim: hoje,
        percentual: 1,
        valorTotal: 0,
        resultadoApurado: `PLR automático — ${hoje.toISOString().slice(0, 10)}`,
        criadoPorId: adminId,
      },
    });
    distribuicaoIds.push(distribuicaoExistente.id);

    const resultado = await criarCampanhaPlrAutomatica({
      percentualTotal: 1,
      periodoInicio: hoje,
      periodoFim: hoje,
      horarioLancamento: "00:00",
      criadoPorId: adminId,
    });
    campanhaIds.push(resultado.campanhaId!);

    await processarDiasPendentes();

    const dia = await prisma.campanhaPlrDia.findFirstOrThrow({ where: { campanhaId: resultado.campanhaId! } });
    expect(dia.distribuicaoId).toBe(distribuicaoExistente.id); // religou na existente, não criou outra
    expect(dia.processadoEm).not.toBeNull();

    const totalParaEssaData = await prisma.distribuicaoMensal.count({
      where: { periodoInicio: hoje, periodoFim: hoje, resultadoApurado: { startsWith: "PLR automático" } },
    });
    expect(totalParaEssaData).toBe(1);
  });
});
