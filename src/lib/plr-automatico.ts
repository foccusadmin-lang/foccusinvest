import { prisma } from "@/lib/prisma";
import { criarDistribuicao, SemCapitalElegivelError } from "@/lib/distribuicao";

/**
 * Faixas diárias (% do capital) por tipo de dia — exatamente como definido pelo usuário: dias
 * úteis comuns têm rendimento moderado, sexta tem o pico da semana, fim de semana fica mais
 * baixo. Usadas pra sortear o cronograma de uma campanha inteira na criação (ver
 * gerarCronogramaDiario). Não inventar outros números — só os que foram dados.
 */
export const FAIXA_SEGUNDA_A_QUINTA = { min: 0.1, max: 0.16 };
export const FAIXA_SEXTA = { min: 0.27, max: 0.33 };
export const FAIXA_FIM_DE_SEMANA = { min: 0.05, max: 0.08 };

/** Teto absoluto por dia quando o PLR está no modo automático — nenhum dia do cronograma pode
 *  passar disso, nem mesmo pra absorver resíduo de arredondamento (fixado pelo usuário). */
export const LIMITE_MAXIMO_DIARIO = 0.45;

function faixaDoDia(data: Date): { min: number; max: number } {
  const diaSemana = data.getUTCDay(); // 0=domingo, 5=sexta, 6=sábado
  if (diaSemana === 5) return FAIXA_SEXTA;
  if (diaSemana === 0 || diaSemana === 6) return FAIXA_FIM_DE_SEMANA;
  return FAIXA_SEGUNDA_A_QUINTA;
}

function sortearNaFaixa(faixa: { min: number; max: number }): number {
  return faixa.min + Math.random() * (faixa.max - faixa.min);
}

function arredondar2(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function listarDias(periodoInicio: Date, periodoFim: Date): Date[] {
  const dias: Date[] = [];
  const cursor = new Date(periodoInicio);
  while (cursor <= periodoFim) {
    dias.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dias;
}

export type DiaCronograma = { data: Date; percentual: number };

/**
 * Sorteia o percentual de cada dia do período dentro da faixa do seu tipo de dia (seg-qui /
 * sexta / fim de semana), escala tudo proporcionalmente pro total bater com `percentualTotal`
 * (preserva a prioridade sexta > dia útil > fim de semana, já que escalar pelo mesmo fator não
 * muda a ordem relativa) e então: (1) nunca deixa nenhum dia passar de `LIMITE_MAXIMO_DIARIO`,
 * redistribuindo qualquer sobra entre os outros dias com folga; (2) nunca repete o mesmo
 * percentual em dois dias seguidos (troca 0,01 com outro dia longe o bastante, sempre mantendo
 * a soma exata). `valorDiaAnterior`, se informado, trata o dia anterior ao período (fora do
 * cronograma gerado, ex: o último dia já processado de uma campanha) como se fosse adjacente ao
 * primeiro dia — evita repetir o valor dele também.
 */
export function gerarCronogramaDiario(
  percentualTotal: number,
  periodoInicio: Date,
  periodoFim: Date,
  valorDiaAnterior: number | null = null
): DiaCronograma[] {
  const dias = listarDias(periodoInicio, periodoFim);
  if (dias.length === 0) return [];

  if (dias.length === 1) {
    return [{ data: dias[0], percentual: Math.max(0, Math.min(arredondar2(percentualTotal), LIMITE_MAXIMO_DIARIO)) }];
  }

  const valoresBrutos = dias.map((data) => sortearNaFaixa(faixaDoDia(data)));
  const somaTotalBruta = valoresBrutos.reduce((acc, v) => acc + v, 0);
  const fator = somaTotalBruta > 0 ? percentualTotal / somaTotalBruta : 0;
  const escalados = valoresBrutos.map((v) => arredondar2(Math.max(Math.min(v * fator, LIMITE_MAXIMO_DIARIO), 0)));

  // O arredondamento (e o corte pelo teto) de cada dia individualmente deixa um resíduo na soma
  // total — redistribui entre os dias com folga na direção certa (tira de quem tem mais valor
  // quando sobrou, soma em quem tem mais espaço até o teto quando faltou). Garante soma exata.
  const somaEscalada = escalados.reduce((acc, v) => acc + v, 0);
  const ajustados = distribuirResiduo(escalados, arredondar2(percentualTotal - somaEscalada), LIMITE_MAXIMO_DIARIO);

  const semRepeticoes = quebrarRepeticoesAdjacentes(ajustados, LIMITE_MAXIMO_DIARIO, valorDiaAnterior);

  return dias.map((data, i) => ({ data, percentual: semRepeticoes[i] }));
}

/** Aplica `residuo` (positivo ou negativo) sobre `valores`, sempre mantendo 0 <= valor <=
 *  `limiteMaximo` — quando sobra (residuo negativo), tira primeiro de quem tem mais valor;
 *  quando falta (residuo positivo), soma primeiro em quem tem mais espaço até o teto. Se um
 *  único dia não bastar, passa o restante adiante até zerar o resíduo. */
function distribuirResiduo(valores: number[], residuoInicial: number, limiteMaximo: number): number[] {
  const resultado = [...valores];
  let residuo = residuoInicial;

  const indices = resultado.map((_, i) => i);
  if (residuo >= 0) {
    indices.sort((a, b) => limiteMaximo - resultado[a] - (limiteMaximo - resultado[b])); // mais espaço até o teto primeiro
  } else {
    indices.sort((a, b) => resultado[b] - resultado[a]); // mais valor primeiro
  }

  for (const i of indices) {
    if (Math.abs(residuo) < 0.005) break;
    if (residuo > 0) {
      const espaco = arredondar2(limiteMaximo - resultado[i]);
      if (espaco <= 0) continue;
      const aplicar = Math.min(espaco, residuo);
      resultado[i] = arredondar2(resultado[i] + aplicar);
      residuo = arredondar2(residuo - aplicar);
    } else {
      const aplicar = Math.min(resultado[i], -residuo);
      resultado[i] = arredondar2(resultado[i] - aplicar);
      residuo = arredondar2(residuo + aplicar);
    }
  }

  return resultado;
}

/** Garante que nenhum dia repita o percentual do dia anterior (documento: "não lançar a mesma
 *  porcentagem repetida sequenciada... deverá intercalar"). Quando acontece, tenta subir ou
 *  descer o valor desse dia (sem passar do teto nem ficar negativo, e sem criar um novo empate
 *  com o PRÓXIMO dia) e compensa a diferença em outro dia distante, pra manter a soma total
 *  exata. Compensar um dia pode, por coincidência, criar uma colisão NOVA nele (com o vizinho
 *  dele) ou reverter uma correção anterior — por isso roda várias passadas completas até não
 *  sobrar nenhuma colisão (ou até o limite de tentativas). Se não convergir, devolve o melhor
 *  resultado alcançado — prioriza sempre a soma exata e o teto por dia sobre esse detalhe
 *  estético. */
function quebrarRepeticoesAdjacentes(
  valores: number[],
  limiteMaximo: number,
  valorDiaAnterior: number | null
): number[] {
  const resultado = [...valores];

  for (let passada = 0; passada < 6; passada++) {
    let mudouAlgo = false;

    for (let i = 0; i < resultado.length; i++) {
      const anterior = i === 0 ? valorDiaAnterior : resultado[i - 1];
      if (anterior === null || resultado[i] !== anterior) continue;

      const proximo = i + 1 < resultado.length ? resultado[i + 1] : null;

      // Tenta deltas crescentes (±0,01, ±0,02, ±0,03...) até achar um valor que não bata nem
      // com o anterior nem com o próximo — evita desistir cedo só porque +0,01/-0,01 também
      // colidiram com o próximo dia (comum quando os dias vizinhos vêm da mesma faixa estreita).
      let novoValor: number | null = null;
      for (let passo = 1; passo <= 5 && novoValor === null; passo++) {
        const delta = arredondar2(passo * 0.01);
        const subir = arredondar2(resultado[i] + delta);
        const descer = arredondar2(resultado[i] - delta);
        if (subir <= limiteMaximo && subir !== proximo) novoValor = subir;
        else if (descer >= 0 && descer !== proximo) novoValor = descer;
      }
      if (novoValor === null) continue;

      const diferenca = arredondar2(novoValor - resultado[i]);

      let idxCompensar = -1;
      for (let j = 0; j < resultado.length; j++) {
        if (Math.abs(j - i) < 2) continue;
        // O dia 0 é o único ancorado por um valor EXTERNO (valorDiaAnterior), que essa mesma
        // passada só confere quando chega em i=0 — usá-lo como doador arrisca recriar bem essa
        // colisão sem a passada notar (a próxima passada ainda pega, mas evita gastar tentativas).
        if (j === 0 && valorDiaAnterior !== null) continue;
        const candidato = arredondar2(resultado[j] - diferenca);
        if (candidato >= 0 && candidato <= limiteMaximo) {
          idxCompensar = j;
          break;
        }
      }
      if (idxCompensar === -1) continue; // não achou onde compensar — mantém a soma exata acima de tudo

      resultado[i] = novoValor;
      resultado[idxCompensar] = arredondar2(resultado[idxCompensar] - diferenca);
      mudouAlgo = true;
    }

    if (!mudouAlgo) break; // passada inteira sem nenhuma colisão encontrada — convergiu
  }

  return resultado;
}

export type CriarCampanhaParams = {
  percentualTotal: number;
  periodoInicio: Date;
  periodoFim: Date;
  horarioLancamento: string; // "HH:MM"
  criadoPorId: string;
};

function validarHorario(horario: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(horario);
}

export async function criarCampanhaPlrAutomatica(
  params: CriarCampanhaParams
): Promise<{ error?: string; campanhaId?: string }> {
  const { percentualTotal, periodoInicio, periodoFim, horarioLancamento, criadoPorId } = params;

  if (!percentualTotal || percentualTotal <= 0) return { error: "Informe um percentual total válido." };
  if (periodoFim < periodoInicio) return { error: "A data fim não pode ser antes da data início." };
  if (!validarHorario(horarioLancamento)) return { error: "Informe um horário válido (HH:MM)." };

  const qtdDias = Math.floor((periodoFim.getTime() - periodoInicio.getTime()) / 86400000) + 1;
  const maximoPossivel = qtdDias * LIMITE_MAXIMO_DIARIO;
  if (percentualTotal > maximoPossivel) {
    return {
      error: `Com o teto de ${LIMITE_MAXIMO_DIARIO}% por dia, o máximo possível em ${qtdDias} dia(s) é ${maximoPossivel.toFixed(2)}% — reduza o percentual total ou aumente o período.`,
    };
  }

  // Impede criar uma campanha cujo período sobreponha dias que outra campanha já materializou
  // (lançou de fato) — é exatamente esse cenário (duas campanhas cobrindo o mesmo dia) que
  // duplicaria o PLR daquele dia. Campanhas antigas cujos dias sobrepostos nunca chegaram a ser
  // processados não bloqueiam (correção de campanha antes dela rodar continua permitida).
  const candidatas = await prisma.campanhaPlrAutomatica.findMany({
    where: { periodoInicio: { lte: periodoFim }, periodoFim: { gte: periodoInicio } },
    include: {
      dias: {
        where: { data: { gte: periodoInicio, lte: periodoFim }, processadoEm: { not: null } },
        select: { data: true },
      },
    },
  });
  const conflito = candidatas.find((c) => c.dias.length > 0);
  if (conflito) {
    const diasConflitantes = conflito.dias.map((d) => d.data.toISOString().slice(0, 10)).join(", ");
    return {
      error: `Já existe PLR automático lançado nesse período pela campanha ${conflito.id} (${diasConflitantes}) — ajuste as datas pra não sobrepor.`,
    };
  }

  const cronograma = gerarCronogramaDiario(percentualTotal, periodoInicio, periodoFim);

  const campanhaId = await prisma.$transaction(async (tx) => {
    // Só uma campanha ativa por vez — qualquer outra em andamento é desativada (os dias dela já
    // processados continuam intactos no histórico; só os pendentes deixam de ser lançados).
    await tx.campanhaPlrAutomatica.updateMany({ where: { ativa: true }, data: { ativa: false } });

    const campanha = await tx.campanhaPlrAutomatica.create({
      data: { percentualTotal, periodoInicio, periodoFim, horarioLancamento, criadoPorId, ativa: true },
    });

    await tx.campanhaPlrDia.createMany({
      data: cronograma.map((d) => ({ campanhaId: campanha.id, data: d.data, percentual: d.percentual })),
    });

    return campanha.id;
  });

  return { campanhaId };
}

export async function desativarCampanhaPlrAutomatica(id: string): Promise<void> {
  await prisma.campanhaPlrAutomatica.update({ where: { id }, data: { ativa: false } });
}

/**
 * Regera o cronograma dos dias AINDA NÃO processados de uma campanha (ex: depois de uma
 * correção nas regras de sorteio) — nunca toca nos dias já materializados (já viraram
 * Distribuição de verdade, dinheiro já pode ter se movido). O percentual total continua o mesmo
 * da campanha: soma(dias já processados) + soma(dias regerados) = percentualTotal, sempre.
 * Considera o valor do último dia já processado (se houver) como "dia anterior" pro novo
 * cronograma, pra também não repetir o percentual bem na fronteira entre o que já rodou e o que
 * ainda vai rodar.
 */
export async function recalcularCronogramaRestante(campanhaId: string): Promise<{ error?: string; diasRegerados?: number }> {
  const campanha = await prisma.campanhaPlrAutomatica.findUnique({
    where: { id: campanhaId },
    include: { dias: { orderBy: { data: "asc" } } },
  });
  if (!campanha) return { error: "Campanha não encontrada." };

  const processados = campanha.dias.filter((d) => d.processadoEm !== null);
  const pendentes = campanha.dias.filter((d) => d.processadoEm === null);
  if (pendentes.length === 0) return { error: "Todos os dias dessa campanha já foram processados — não há nada pra regerar." };

  const somaProcessada = processados.reduce((acc, d) => acc + d.percentual, 0);
  const restante = arredondar2(campanha.percentualTotal - somaProcessada);
  const maximoPossivel = pendentes.length * LIMITE_MAXIMO_DIARIO;
  if (restante > maximoPossivel + 0.005) {
    return {
      error: `O que falta distribuir (${restante.toFixed(2)}%) passa do máximo possível nos ${pendentes.length} dia(s) pendentes com o teto de ${LIMITE_MAXIMO_DIARIO}% por dia (${maximoPossivel.toFixed(2)}%).`,
    };
  }

  const primeiroPendente = pendentes[0].data;
  const ultimoPendente = pendentes[pendentes.length - 1].data;
  const ultimoProcessado = processados[processados.length - 1] ?? null;

  const novoCronograma = gerarCronogramaDiario(
    restante,
    primeiroPendente,
    ultimoPendente,
    ultimoProcessado?.percentual ?? null
  );

  await prisma.$transaction(
    novoCronograma.map((dia, i) =>
      prisma.campanhaPlrDia.update({ where: { id: pendentes[i].id }, data: { percentual: dia.percentual } })
    )
  );

  return { diasRegerados: novoCronograma.length };
}

export type CampanhaComDias = {
  id: string;
  percentualTotal: number;
  periodoInicio: Date;
  periodoFim: Date;
  horarioLancamento: string;
  ativa: boolean;
  criadoEm: Date;
  criadoPor: { name: string | null; email: string };
  dias: { id: string; data: Date; percentual: number; processadoEm: Date | null }[];
};

export async function listarCampanhas(): Promise<CampanhaComDias[]> {
  return prisma.campanhaPlrAutomatica.findMany({
    orderBy: { criadoEm: "desc" },
    include: {
      criadoPor: { select: { name: true, email: true } },
      dias: { orderBy: { data: "asc" } },
    },
  });
}

function horaAtualBrasilia(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

/**
 * Rodada do motor automático — chamada pelo cron (ver api/cron/plr-automatico). Pra cada
 * campanha ativa, materializa (cria a Distribuição de fato, reaproveitando `criarDistribuicao`)
 * todo dia que: já chegou (data <= hoje), o horário configurado da campanha já passou (horário
 * de Brasília) e ainda não foi processado.
 *
 * Duas camadas de proteção contra lançar o mesmo dia duas vezes:
 * 1. Reivindicação atômica — marca `processadoEm` ANTES de criar a Distribuição (via update
 *    condicional que só afeta a linha se ela ainda estiver com processadoEm null), fechando a
 *    janela de corrida de duas rodadas do cron acontecendo ao mesmo tempo. Se `criarDistribuicao`
 *    falhar depois da reivindicação (erro inesperado, não SemCapitalElegivel), desfaz a
 *    reivindicação pra tentar de novo na próxima rodada.
 * 2. Checagem entre campanhas — antes de criar uma Distribuição nova, confere se já existe uma
 *    "PLR automático" pra aquela data exata (de QUALQUER campanha, não só a atual). Se existir
 *    (ex: duas campanhas com período sobreposto), reaproveita a Distribuição já criada em vez de
 *    duplicar — auto-corrige sozinho, sem precisar de intervenção manual.
 */
export async function processarDiasPendentes(): Promise<{ processados: number; erros: string[] }> {
  const agora = new Date();
  const horaAtual = horaAtualBrasilia();
  const erros: string[] = [];
  let processados = 0;

  const campanhas = await prisma.campanhaPlrAutomatica.findMany({
    where: { ativa: true },
    include: { dias: { where: { processadoEm: null, data: { lte: agora } } } },
  });

  for (const campanha of campanhas) {
    if (horaAtual < campanha.horarioLancamento) continue;

    for (const dia of campanha.dias) {
      const dataTexto = dia.data.toISOString().slice(0, 10);

      // Reivindicação atômica: só segue se ESTA chamada foi quem marcou processadoEm agora —
      // se outra rodada já reivindicou entre a busca acima e aqui, count vem 0 e pula.
      const reivindicado = await prisma.campanhaPlrDia.updateMany({
        where: { id: dia.id, processadoEm: null },
        data: { processadoEm: agora },
      });
      if (reivindicado.count === 0) continue;

      try {
        // Rede de segurança entre campanhas: se já existe uma Distribuição "PLR automático"
        // pra essa data exata (de outra campanha, período sobreposto), religa nela em vez de
        // criar uma segunda — nunca duplica o crédito do investidor.
        const existente = await prisma.distribuicaoMensal.findFirst({
          where: {
            periodoInicio: dia.data,
            periodoFim: dia.data,
            resultadoApurado: { startsWith: "PLR automático" },
          },
          orderBy: { criadoEm: "asc" },
        });

        if (existente) {
          await prisma.campanhaPlrDia.update({ where: { id: dia.id }, data: { distribuicaoId: existente.id } });
          erros.push(
            `Campanha ${campanha.id}, dia ${dataTexto}: já existia Distribuição ${existente.id} pra essa data (período sobreposto entre campanhas) — reaproveitada, nada duplicado.`
          );
          continue;
        }

        const { distribuicaoId } = await criarDistribuicao({
          criadoPorId: campanha.criadoPorId,
          periodoInicio: dia.data,
          periodoFim: dia.data,
          percentual: dia.percentual,
          resultadoApurado: `PLR automático — ${dataTexto}`,
        });

        await prisma.campanhaPlrDia.update({ where: { id: dia.id }, data: { distribuicaoId } });
        processados++;
      } catch (err) {
        if (err instanceof SemCapitalElegivelError) {
          // Sem ninguém elegível hoje — mantém a reivindicação (não fica tentando de novo a
          // cada rodada pro mesmo dia) e segue pro próximo.
          continue;
        }
        // Erro inesperado: desfaz a reivindicação pra essa data poder ser tentada de novo na
        // próxima rodada, em vez de ficar presa como "processada" sem nenhuma Distribuição.
        await prisma.campanhaPlrDia.update({ where: { id: dia.id }, data: { processadoEm: null } });
        erros.push(`Campanha ${campanha.id}, dia ${dataTexto}: ${(err as Error).message}`);
      }
    }
  }

  return { processados, erros };
}
