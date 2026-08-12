import { prisma } from "@/lib/prisma";
import { formatMoeda } from "@/lib/format";
import { consumirFIFO, SaldoInsuficienteError, type TxClient } from "@/lib/carteira";

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
