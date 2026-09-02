import "dotenv/config";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  criarCampanhaPlrAutomatica,
  desativarCampanhaPlrAutomatica,
  cancelarCampanhaPlrAutomatica,
  excluirCampanhaPlrAutomatica,
  processarDiasPendentes,
  recalcularCronogramaRestante,
  LIMITE_MAXIMO_DIARIO,
} from "@/lib/plr-automatico";
import { sincronizarDistribuicoesDoUsuario } from "@/lib/distribuicao";

// `processarDiasPendentes` chama `criarDistribuicao` SEM `userIds` (por design: PLR automático
// de verdade aplica a TODOS os investidores elegíveis). Rodar isso contra o banco compartilhado
// (dev/prod) sem essa trava já vazou crédito real pra um investidor de verdade nesta sessão — a
// distribuição de teste existiu por uma fração de segundo, tempo suficiente pra alguém sincronizar
// a própria carteira no meio do caminho. Esse mock força TODA chamada de criarDistribuicao feita
// durante estes testes a ficar restrita só ao investidor de teste do `beforeEach`, sem alterar
// nenhuma outra lógica real (atomicidade da reivindicação, dedupe entre campanhas, gate de
// horário — tudo isso continua batendo direto no banco de verdade).
const investidoresElegiveisDeTeste = vi.hoisted(() => ({ ids: [] as string[] }));

vi.mock("@/lib/distribuicao", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/distribuicao")>();
  return {
    ...original,
    criarDistribuicao: (params: Parameters<typeof original.criarDistribuicao>[0]) =>
      original.criarDistribuicao({ ...params, userIds: investidoresElegiveisDeTeste.ids }),
  };
});

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

    // Trava de segurança (ver mock acima): só o investidor deste teste pode ser considerado
    // elegível por qualquer criarDistribuicao chamada durante o teste.
    investidoresElegiveisDeTeste.ids = [investidorId];

    campanhaIds = [];
    distribuicaoIds = [];
  });

  afterEach(async () => {
    investidoresElegiveisDeTeste.ids = [];
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
      percentualTotal: 0.5, // período de 2 dias, máximo possível é 0,90%
      periodoInicio: hoje,
      periodoFim: new Date(hoje.getTime() + 86400000),
      horarioLancamento: "00:00",
      criadoPorId: adminId,
    });
    campanhaIds.push(r1.campanhaId!);

    const r2 = await criarCampanhaPlrAutomatica({
      percentualTotal: 0.8,
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
      percentualTotal: 0.3, // período de 1 dia, máximo possível é 0,45% // período de 3 dias, máximo possível é 1,35%
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
      percentualTotal: 0.3, // período de 1 dia, máximo possível é 0,45%
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
    // Um horário "mais tarde hoje" sem nunca virar o dia (evita o teste ficar instável perto da
    // meia-noite de Brasília, quando "agora + Xh" cairia amanhã e a comparação de string
    // "HH:MM" pararia de fazer sentido — a produção nunca soma horas assim, só compara contra o
    // horário atual do próprio dia, então esse cuidado é só do teste). Margem de 5 minutos (não
    // 1) pra sobrar folga real contra o tempo de execução do teste até chamar
    // processarDiasPendentes — 1 minuto de folga já se mostrou insuficiente na prática.
    const partes = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(agora);
    const horaAtual = parseInt(partes.find((p) => p.type === "hour")?.value ?? "0", 10);
    const minutoAtual = parseInt(partes.find((p) => p.type === "minute")?.value ?? "0", 10);
    const horarioTexto =
      minutoAtual < 54
        ? `${String(horaAtual).padStart(2, "0")}:${String(minutoAtual + 5).padStart(2, "0")}`
        : `${String(Math.min(horaAtual + 1, 23)).padStart(2, "0")}:59`;

    const resultado = await criarCampanhaPlrAutomatica({
      percentualTotal: 0.3, // período de 1 dia, máximo possível é 0,45%
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
      percentualTotal: 0.3, // período de 1 dia, máximo possível é 0,45%
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
      percentualTotal: 0.3, // período de 1 dia, máximo possível é 0,45%
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
      percentualTotal: 0.3, // período de 1 dia, máximo possível é 0,45%
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
      percentualTotal: 0.35, // feasível isoladamente — a rejeição precisa ser por sobreposição, não por teto
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
      percentualTotal: 0.3, // período de 1 dia, máximo possível é 0,45%
      periodoInicio: amanha,
      periodoFim: amanha,
      horarioLancamento: "00:00",
      criadoPorId: adminId,
    });
    campanhaIds.push(r1.campanhaId!);
    // Não roda processarDiasPendentes — nada foi lançado ainda (a data é amanhã).

    const r2 = await criarCampanhaPlrAutomatica({
      percentualTotal: 0.4, // período de 1 dia, máximo possível é 0,45%
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
      percentualTotal: 0.3, // período de 1 dia, máximo possível é 0,45%
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

  it("recusa criar campanha cujo percentual total passa do máximo possível com o teto de 0,45%/dia", async () => {
    const inicio = new Date();
    const fim = new Date(inicio.getTime() + 4 * 86400000); // 5 dias, máximo 2,25%

    const resultado = await criarCampanhaPlrAutomatica({
      percentualTotal: 3, // passa do máximo possível (2,25%)
      periodoInicio: inicio,
      periodoFim: fim,
      horarioLancamento: "00:00",
      criadoPorId: adminId,
    });

    expect(resultado.error).toBeDefined();
    expect(resultado.campanhaId).toBeUndefined();
  });

  it("recalcularCronogramaRestante regenera só os dias pendentes, preservando os já processados e a soma total", async () => {
    const inicio = new Date(Date.now() - 2 * 86400000); // começou há 2 dias
    const fim = new Date(Date.now() + 5 * 86400000); // termina daqui a 5 dias (8 dias no total)

    const resultado = await criarCampanhaPlrAutomatica({
      percentualTotal: 2,
      periodoInicio: inicio,
      periodoFim: fim,
      horarioLancamento: "00:00", // já passou — processa os dias que já chegaram
      criadoPorId: adminId,
    });
    campanhaIds.push(resultado.campanhaId!);

    // Materializa os dias que já chegaram (há 2 dias, ontem, hoje — 3 dias já "processados").
    await processarDiasPendentes();

    const antesDaCorrecao = await prisma.campanhaPlrDia.findMany({
      where: { campanhaId: resultado.campanhaId! },
      orderBy: { data: "asc" },
    });
    for (const d of antesDaCorrecao) if (d.distribuicaoId) distribuicaoIds.push(d.distribuicaoId);
    const processadosAntes = antesDaCorrecao.filter((d) => d.processadoEm !== null);
    const pendentesAntes = antesDaCorrecao.filter((d) => d.processadoEm === null);
    expect(processadosAntes.length).toBeGreaterThan(0);
    expect(pendentesAntes.length).toBeGreaterThan(0);
    const valoresProcessadosAntes = processadosAntes.map((d) => d.percentual);

    const correcao = await recalcularCronogramaRestante(resultado.campanhaId!);
    expect(correcao.error).toBeUndefined();
    expect(correcao.diasRegerados).toBe(pendentesAntes.length);

    const depois = await prisma.campanhaPlrDia.findMany({
      where: { campanhaId: resultado.campanhaId! },
      orderBy: { data: "asc" },
    });

    // Dias já processados: percentual intacto, processadoEm/distribuicaoId intocados.
    const processadosDepois = depois.filter((d) => d.processadoEm !== null);
    expect(processadosDepois.map((d) => d.percentual)).toEqual(valoresProcessadosAntes);

    // Soma total continua batendo com o percentualTotal da campanha.
    const somaTotal = depois.reduce((acc, d) => acc + d.percentual, 0);
    expect(somaTotal).toBeCloseTo(2, 2);

    // Nenhum dia (processado ou regerado) passa do teto.
    for (const d of depois) expect(d.percentual).toBeLessThanOrEqual(LIMITE_MAXIMO_DIARIO);
  });

  it("recalcularCronogramaRestante recusa quando todos os dias já foram processados", async () => {
    const hoje = new Date();
    const resultado = await criarCampanhaPlrAutomatica({
      percentualTotal: 0.3,
      periodoInicio: hoje,
      periodoFim: hoje,
      horarioLancamento: "00:00",
      criadoPorId: adminId,
    });
    campanhaIds.push(resultado.campanhaId!);
    await processarDiasPendentes();

    const dias = await prisma.campanhaPlrDia.findMany({ where: { campanhaId: resultado.campanhaId! } });
    for (const d of dias) if (d.distribuicaoId) distribuicaoIds.push(d.distribuicaoId);

    const correcao = await recalcularCronogramaRestante(resultado.campanhaId!);
    expect(correcao.error).toBeDefined();
  });

  describe("cancelarCampanhaPlrAutomatica", () => {
    it("remove a campanha por completo quando nenhum dia foi processado ainda", async () => {
      const inicio = new Date();
      const fim = new Date(inicio.getTime() + 3 * 86400000);
      const resultado = await criarCampanhaPlrAutomatica({
        percentualTotal: 1,
        periodoInicio: inicio,
        periodoFim: fim,
        horarioLancamento: "23:59",
        criadoPorId: adminId,
      });
      // Não empurra pra campanhaIds — se o cancelamento funcionar, já não sobra nada pra limpar.

      const cancelamento = await cancelarCampanhaPlrAutomatica(resultado.campanhaId!);
      expect(cancelamento.error).toBeUndefined();
      expect(cancelamento.removidaPorCompleto).toBe(true);

      const campanha = await prisma.campanhaPlrAutomatica.findUnique({ where: { id: resultado.campanhaId! } });
      expect(campanha).toBeNull();
      const dias = await prisma.campanhaPlrDia.findMany({ where: { campanhaId: resultado.campanhaId! } });
      expect(dias).toHaveLength(0);
    });

    it("preserva os dias já processados e remove só os pendentes quando parte da campanha já rodou", async () => {
      const inicio = new Date(Date.now() - 86400000); // ontem
      const fim = new Date(Date.now() + 3 * 86400000);
      const resultado = await criarCampanhaPlrAutomatica({
        percentualTotal: 1,
        periodoInicio: inicio,
        periodoFim: fim,
        horarioLancamento: "00:00",
        criadoPorId: adminId,
      });
      campanhaIds.push(resultado.campanhaId!);

      await processarDiasPendentes(); // materializa ontem e hoje

      const antes = await prisma.campanhaPlrDia.findMany({ where: { campanhaId: resultado.campanhaId! } });
      for (const d of antes) if (d.distribuicaoId) distribuicaoIds.push(d.distribuicaoId);
      const processadosAntes = antes.filter((d) => d.processadoEm !== null);
      const pendentesAntes = antes.filter((d) => d.processadoEm === null);
      expect(processadosAntes.length).toBeGreaterThan(0);
      expect(pendentesAntes.length).toBeGreaterThan(0);

      const cancelamento = await cancelarCampanhaPlrAutomatica(resultado.campanhaId!);
      expect(cancelamento.removidaPorCompleto).toBe(false);
      expect(cancelamento.diasPendentesRemovidos).toBe(pendentesAntes.length);

      const campanha = await prisma.campanhaPlrAutomatica.findUnique({ where: { id: resultado.campanhaId! } });
      expect(campanha).not.toBeNull();
      expect(campanha?.ativa).toBe(false);

      const depois = await prisma.campanhaPlrDia.findMany({ where: { campanhaId: resultado.campanhaId! } });
      expect(depois).toHaveLength(processadosAntes.length); // só os processados sobraram
      expect(depois.every((d) => d.processadoEm !== null)).toBe(true);

      // As Distribuições/créditos reais gerados continuam intactos.
      for (const d of processadosAntes) {
        const distribuicao = await prisma.distribuicaoMensal.findUnique({ where: { id: d.distribuicaoId! } });
        expect(distribuicao).not.toBeNull();
      }
    });
  });

  describe("excluirCampanhaPlrAutomatica", () => {
    it("nunca apaga um dia já processado (nem o CampanhaPlrDia, nem a Distribuição real) — mesma trava de cancelar", async () => {
      const hoje = new Date();
      const resultado = await criarCampanhaPlrAutomatica({
        percentualTotal: 0.3,
        periodoInicio: hoje,
        periodoFim: hoje,
        horarioLancamento: "00:00",
        criadoPorId: adminId,
      });
      campanhaIds.push(resultado.campanhaId!);

      await processarDiasPendentes();
      const dia = await prisma.campanhaPlrDia.findFirstOrThrow({ where: { campanhaId: resultado.campanhaId! } });
      expect(dia.distribuicaoId).not.toBeNull();
      distribuicaoIds.push(dia.distribuicaoId!);

      const exclusao = await excluirCampanhaPlrAutomatica(resultado.campanhaId!);
      expect(exclusao.error).toBeUndefined();
      expect(exclusao.removidaPorCompleto).toBe(false); // não dá — tem dia processado

      // A campanha continua existindo (só desativada) e o dia já processado continua lá.
      const campanha = await prisma.campanhaPlrAutomatica.findUnique({ where: { id: resultado.campanhaId! } });
      expect(campanha).not.toBeNull();
      expect(campanha?.ativa).toBe(false);
      const diaDepois = await prisma.campanhaPlrDia.findUnique({ where: { id: dia.id } });
      expect(diaDepois).not.toBeNull();
      expect(diaDepois?.distribuicaoId).toBe(dia.distribuicaoId);

      const distribuicao = await prisma.distribuicaoMensal.findUnique({ where: { id: dia.distribuicaoId! } });
      expect(distribuicao).not.toBeNull();

      await prisma.$transaction((tx) => sincronizarDistribuicoesDoUsuario(tx, investidorId));
      const creditos = await prisma.creditoCarteira.findMany({ where: { userId: investidorId, tipo: "RENDIMENTO" } });
      expect(creditos.length).toBeGreaterThan(0);
    });

    it("remove a campanha por completo quando nenhum dia foi processado ainda", async () => {
      const inicio = new Date();
      const fim = new Date(inicio.getTime() + 2 * 86400000);
      const resultado = await criarCampanhaPlrAutomatica({
        percentualTotal: 0.5,
        periodoInicio: inicio,
        periodoFim: fim,
        horarioLancamento: "23:59",
        criadoPorId: adminId,
      });

      const exclusao = await excluirCampanhaPlrAutomatica(resultado.campanhaId!);
      expect(exclusao.removidaPorCompleto).toBe(true);

      const campanha = await prisma.campanhaPlrAutomatica.findUnique({ where: { id: resultado.campanhaId! } });
      expect(campanha).toBeNull();
    });

    it("recusa excluir uma campanha inexistente", async () => {
      const exclusao = await excluirCampanhaPlrAutomatica("id-que-nao-existe");
      expect(exclusao.error).toBeDefined();
    });
  });
});
