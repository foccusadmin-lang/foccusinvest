import { prisma } from "@/lib/prisma";
import { formatMoeda } from "@/lib/format";
import { consumirFIFO, calcularLiberacao, SaldoInsuficienteError, type TxClient } from "@/lib/carteira";

/** Incentivo de liderança fica guardado como CreditoCarteira tipo RENDIMENTO (soma normalmente
 *  em rendimento disponível, saque, reaplicação...), diferenciado só pelo prefixo da origem —
 *  mesmo padrão já usado pra "PLR manual" e "Distribuição". Isso evita duplicar toda a
 *  infraestrutura de saque/reaplicação/histórico só pra esse tipo de crédito. */
export const ORIGEM_INCENTIVO_PREFIXO = "Incentivo de liderança";
const ORIGEM_AJUSTE_ADMIN = "Incentivo de liderança (ajuste admin)";
const EPSILON = 0.005;

export async function saldoIncentivoLiderancaDisponivel(userId: string): Promise<number> {
  const linhas = await prisma.creditoCarteira.findMany({
    where: {
      userId,
      tipo: "RENDIMENTO",
      utilizadoEm: null,
      solicitacaoSaqueId: null,
      origem: { startsWith: ORIGEM_INCENTIVO_PREFIXO },
    },
  });
  return linhas.reduce((acc, l) => acc + l.valor, 0);
}

export async function adicionarIncentivoLideranca(userId: string, valor: number): Promise<void> {
  await prisma.creditoCarteira.create({
    data: { userId, tipo: "RENDIMENTO", valor, moeda: "BRL", origem: ORIGEM_AJUSTE_ADMIN },
  });
}

/** Reduz o incentivo de liderança ainda livre (não usado nem reservado num saque), consumindo
 *  os lançamentos mais antigos primeiro e apagando os que zerarem. */
async function reduzirIncentivoLideranca(userId: string, valorReduzir: number): Promise<string | null> {
  const linhas = await prisma.creditoCarteira.findMany({
    where: {
      userId,
      tipo: "RENDIMENTO",
      utilizadoEm: null,
      solicitacaoSaqueId: null,
      origem: { startsWith: ORIGEM_INCENTIVO_PREFIXO },
    },
    orderBy: { criadoEm: "asc" },
  });

  let restante = valorReduzir;
  for (const linha of linhas) {
    if (restante <= EPSILON) break;
    if (linha.valor <= restante + EPSILON) {
      await prisma.creditoCarteira.delete({ where: { id: linha.id } });
      restante -= linha.valor;
    } else {
      await prisma.creditoCarteira.update({ where: { id: linha.id }, data: { valor: linha.valor - restante } });
      restante = 0;
    }
  }

  if (restante > EPSILON) {
    return `Só é possível reduzir até o incentivo de liderança ainda livre (não usado nem reservado num saque). Faltou reduzir ${formatMoeda(restante)}.`;
  }
  return null;
}

/** Ajusta o incentivo de liderança disponível pro valor exato informado — pode aumentar ou
 *  diminuir, igual ao "Definir" do ajuste de saldo normal. */
export async function definirIncentivoLideranca(userId: string, valor: number): Promise<string | null> {
  const atual = await saldoIncentivoLiderancaDisponivel(userId);
  const delta = valor - atual;

  if (delta > EPSILON) {
    await adicionarIncentivoLideranca(userId, delta);
  } else if (delta < -EPSILON) {
    return await reduzirIncentivoLideranca(userId, -delta);
  }
  return null;
}

export async function zerarIncentivoLideranca(userId: string): Promise<string | null> {
  return definirIncentivoLideranca(userId, 0);
}

/** Reserva incentivo de liderança disponível pra uma solicitação de saque — mesmo padrão de
 *  reservarCreditosParaSaque, só filtrado pela origem do incentivo em vez do tipo puro. */
export async function reservarIncentivoLiderancaParaSaque(
  tx: TxClient,
  userId: string,
  valor: number,
  solicitacaoSaqueId: string
): Promise<void> {
  const disponiveis = await tx.creditoCarteira.findMany({
    where: {
      userId,
      tipo: "RENDIMENTO",
      utilizadoEm: null,
      solicitacaoSaqueId: null,
      origem: { startsWith: ORIGEM_INCENTIVO_PREFIXO },
    },
    orderBy: { criadoEm: "asc" },
  });

  const restante = await consumirFIFO(
    disponiveis,
    valor,
    async (credito) => {
      await tx.creditoCarteira.update({ where: { id: credito.id }, data: { solicitacaoSaqueId } });
    },
    async (credito, _valorConsumido, valorRestanteNaLinha) => {
      const cheio = await tx.creditoCarteira.findUniqueOrThrow({ where: { id: credito.id } });
      await tx.creditoCarteira.update({ where: { id: credito.id }, data: { valor: valorRestanteNaLinha } });
      await tx.creditoCarteira.create({
        data: {
          userId,
          tipo: "RENDIMENTO",
          valor: cheio.valor - valorRestanteNaLinha,
          moeda: cheio.moeda,
          origem: cheio.origem,
          solicitacaoSaqueId,
        },
      });
    }
  );

  if (restante > 0.005) {
    throw new SaldoInsuficienteError("Incentivo de liderança disponível insuficiente para este saque.");
  }
}

export type FonteReaplicacao = "PLR" | "INCENTIVO_LIDERANCA" | "BONUS";

const LABEL_FONTE: Record<FonteReaplicacao, string> = {
  PLR: "Rendimento/PLR",
  INCENTIVO_LIDERANCA: "Incentivo de liderança",
  BONUS: "Bônus de indicação",
};

/** Reaplica valores escolhidos pelo próprio investidor, fonte por fonte (PLR, incentivo de
 *  liderança e/ou bônus) — total ou parcial de cada uma, ao contrário de `reaplicarSaldoDisponivel`
 *  (lib/carteira.ts), que sempre consome tudo misturado numa fila só. Cria um único novo lote
 *  (Aplicacao) com a soma de tudo, com a carência normal de 90 dias. */
export async function reaplicarSaldoPorFonte(
  tx: TxClient,
  userId: string,
  itens: { fonte: FonteReaplicacao; valor: number }[]
): Promise<void> {
  let totalReaplicado = 0;

  for (const item of itens) {
    if (item.valor <= EPSILON) continue;
    totalReaplicado += item.valor;

    const where =
      item.fonte === "BONUS"
        ? { userId, tipo: "BONUS" as const, utilizadoEm: null, solicitacaoSaqueId: null }
        : item.fonte === "INCENTIVO_LIDERANCA"
          ? {
              userId,
              tipo: "RENDIMENTO" as const,
              utilizadoEm: null,
              solicitacaoSaqueId: null,
              origem: { startsWith: ORIGEM_INCENTIVO_PREFIXO },
            }
          : {
              userId,
              tipo: "RENDIMENTO" as const,
              utilizadoEm: null,
              solicitacaoSaqueId: null,
              NOT: { origem: { startsWith: ORIGEM_INCENTIVO_PREFIXO } },
            };

    const disponiveis = await tx.creditoCarteira.findMany({ where, orderBy: { criadoEm: "asc" } });

    const restante = await consumirFIFO(
      disponiveis,
      item.valor,
      async (credito) => {
        await tx.creditoCarteira.update({ where: { id: credito.id }, data: { utilizadoEm: new Date() } });
      },
      async (credito, _valorConsumido, valorRestanteNaLinha) => {
        const cheio = await tx.creditoCarteira.findUniqueOrThrow({ where: { id: credito.id } });
        await tx.creditoCarteira.update({ where: { id: credito.id }, data: { valor: valorRestanteNaLinha } });
        await tx.creditoCarteira.create({
          data: {
            userId,
            tipo: cheio.tipo,
            valor: cheio.valor - valorRestanteNaLinha,
            moeda: cheio.moeda,
            origem: cheio.origem,
            utilizadoEm: new Date(),
          },
        });
      }
    );

    if (restante > EPSILON) {
      throw new SaldoInsuficienteError(
        `Saldo de ${LABEL_FONTE[item.fonte]} insuficiente para reaplicação.`
      );
    }
  }

  if (totalReaplicado <= EPSILON) {
    throw new SaldoInsuficienteError("Informe pelo menos um valor pra reaplicar.");
  }

  await tx.aplicacao.create({
    data: {
      userId,
      valor: totalReaplicado,
      moeda: "BRL",
      origem: "REAPLICACAO",
      status: "CONFIRMADA",
      liberaEm: calcularLiberacao(),
    },
  });
}

export type FonteSaqueRendimento = "PLR" | "INCENTIVO_LIDERANCA";

const LABEL_FONTE_SAQUE: Record<FonteSaqueRendimento, string> = {
  PLR: "Rendimento/PLR",
  INCENTIVO_LIDERANCA: "Incentivo de liderança",
};

/** Reserva rendimento disponível pra um saque, fonte por fonte (PLR e/ou incentivo de
 *  liderança) — total ou parcial de cada uma, ao contrário de `reservarCreditosParaSaque`
 *  (lib/carteira.ts), que consome tudo misturado numa fila só. Cria uma única solicitação de
 *  saque (o valor total já foi somado pelo chamador). Deve ser chamada dentro de uma
 *  transação já aberta pelo chamador. */
export async function reservarSaqueRendimentoPorFonte(
  tx: TxClient,
  userId: string,
  itens: { fonte: FonteSaqueRendimento; valor: number }[],
  solicitacaoSaqueId: string
): Promise<void> {
  for (const item of itens) {
    if (item.valor <= EPSILON) continue;

    const where =
      item.fonte === "INCENTIVO_LIDERANCA"
        ? {
            userId,
            tipo: "RENDIMENTO" as const,
            utilizadoEm: null,
            solicitacaoSaqueId: null,
            origem: { startsWith: ORIGEM_INCENTIVO_PREFIXO },
          }
        : {
            userId,
            tipo: "RENDIMENTO" as const,
            utilizadoEm: null,
            solicitacaoSaqueId: null,
            NOT: { origem: { startsWith: ORIGEM_INCENTIVO_PREFIXO } },
          };

    const disponiveis = await tx.creditoCarteira.findMany({ where, orderBy: { criadoEm: "asc" } });

    const restante = await consumirFIFO(
      disponiveis,
      item.valor,
      async (credito) => {
        await tx.creditoCarteira.update({ where: { id: credito.id }, data: { solicitacaoSaqueId } });
      },
      async (credito, _valorConsumido, valorRestanteNaLinha) => {
        const cheio = await tx.creditoCarteira.findUniqueOrThrow({ where: { id: credito.id } });
        await tx.creditoCarteira.update({ where: { id: credito.id }, data: { valor: valorRestanteNaLinha } });
        await tx.creditoCarteira.create({
          data: {
            userId,
            tipo: cheio.tipo,
            valor: cheio.valor - valorRestanteNaLinha,
            moeda: cheio.moeda,
            origem: cheio.origem,
            solicitacaoSaqueId,
          },
        });
      }
    );

    if (restante > EPSILON) {
      throw new SaldoInsuficienteError(
        `Saldo de ${LABEL_FONTE_SAQUE[item.fonte]} insuficiente para este saque.`
      );
    }
  }
}

export type ResultadoLiberacao = { creditados: number; total: number };

/** Libera um percentual de incentivo de liderança pra TODOS os líderes de uma vez — percentual
 *  aplicado sobre o capital de cada um. Reaproveitada tanto pelo botão manual do admin quanto
 *  pelo cron automático (ver /api/cron/liberar-incentivo-lideranca), pra nunca duplicar a
 *  lógica entre os dois caminhos. */
export async function liberarIncentivoParaTodosLideres(
  percentual: number,
  criadoEm: Date,
  origemSufixo: string
): Promise<ResultadoLiberacao> {
  const lideres = await prisma.user.findMany({ where: { perfil: "LIDER" }, select: { id: true } });
  const liderIds = lideres.map((l) => l.id);
  if (liderIds.length === 0) return { creditados: 0, total: 0 };

  const capitaisPorLider = await prisma.aplicacao.groupBy({
    by: ["userId"],
    where: { userId: { in: liderIds }, status: { in: ["CONFIRMADA", "SAQUE_SOLICITADO"] } },
    _sum: { valor: true },
  });
  const capitalPorId = new Map(capitaisPorLider.map((c) => [c.userId, c._sum.valor ?? 0]));

  const origem = `${ORIGEM_INCENTIVO_PREFIXO} ${percentual}%${origemSufixo}`;

  const creditos = liderIds
    .map((userId) => ({ userId, valor: (capitalPorId.get(userId) ?? 0) * (percentual / 100) }))
    .filter((c) => c.valor > 0);

  const total = creditos.reduce((acc, c) => acc + c.valor, 0);

  if (creditos.length > 0) {
    await prisma.creditoCarteira.createMany({
      data: creditos.map((c) => ({
        userId: c.userId,
        tipo: "RENDIMENTO",
        valor: c.valor,
        moeda: "BRL",
        origem,
        criadoEm,
      })),
    });
  }

  return { creditados: creditos.length, total };
}

export type LiderResumo = {
  id: string;
  nome: string;
  email: string;
  capital: number;
  incentivoAcumulado: number;
  incentivoDisponivel: number;
  desde: Date;
};

export async function listarLideres(): Promise<LiderResumo[]> {
  const lideres = await prisma.user.findMany({
    where: { perfil: "LIDER" },
    include: { pessoaFisica: true, pessoaJuridica: true },
    orderBy: { createdAt: "desc" },
  });
  if (lideres.length === 0) return [];

  const ids = lideres.map((l) => l.id);
  const [capitais, creditos] = await Promise.all([
    prisma.aplicacao.groupBy({
      by: ["userId"],
      where: { userId: { in: ids }, status: { in: ["CONFIRMADA", "SAQUE_SOLICITADO"] } },
      _sum: { valor: true },
    }),
    prisma.creditoCarteira.findMany({
      where: { userId: { in: ids }, tipo: "RENDIMENTO", origem: { startsWith: ORIGEM_INCENTIVO_PREFIXO } },
    }),
  ]);

  const capitalPorId = new Map(capitais.map((c) => [c.userId, c._sum.valor ?? 0]));
  const acumuladoPorId = new Map<string, number>();
  const disponivelPorId = new Map<string, number>();
  for (const c of creditos) {
    acumuladoPorId.set(c.userId, (acumuladoPorId.get(c.userId) ?? 0) + c.valor);
    if (!c.utilizadoEm && !c.solicitacaoSaqueId) {
      disponivelPorId.set(c.userId, (disponivelPorId.get(c.userId) ?? 0) + c.valor);
    }
  }

  return lideres.map((l) => ({
    id: l.id,
    nome: l.pessoaFisica?.nomeCompleto ?? l.pessoaJuridica?.razaoSocial ?? l.name ?? l.email,
    email: l.email,
    capital: capitalPorId.get(l.id) ?? 0,
    incentivoAcumulado: acumuladoPorId.get(l.id) ?? 0,
    incentivoDisponivel: disponivelPorId.get(l.id) ?? 0,
    desde: l.createdAt,
  }));
}
