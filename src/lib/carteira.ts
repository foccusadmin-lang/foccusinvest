import { prisma } from "@/lib/prisma";
import { ultimasSextas, inicioDoMesBrasilia } from "@/lib/datas";
import { sincronizarDistribuicoesDoUsuario } from "@/lib/distribuicao";
import type { PontoRendimento } from "@/components/painel/rendimentos-chart";
import type { ResumoFinanceiro } from "@/components/painel/dashboard";
import type { Prisma, TipoCredito } from "@prisma/client";

const NOVENTA_DIAS_MS = 90 * 24 * 60 * 60 * 1000;
const EPSILON = 0.005;

export class SaldoInsuficienteError extends Error {}

export type TxClient = Prisma.TransactionClient;
type LinhaComValor = { id: string; valor: number };

/** Consome linhas em ordem (FIFO) até atingir `valorAlvo`, dividindo a última linha se necessário. */
export async function consumirFIFO<T extends LinhaComValor>(
  linhas: T[],
  valorAlvo: number,
  onTotal: (linha: T) => Promise<void>,
  onParcial: (linha: T, valorConsumido: number, valorRestanteNaLinha: number) => Promise<void>
): Promise<number> {
  let restante = valorAlvo;
  for (const linha of linhas) {
    if (restante <= 0) break;
    if (linha.valor <= restante + EPSILON) {
      await onTotal(linha);
      restante -= linha.valor;
    } else {
      await onParcial(linha, restante, linha.valor - restante);
      restante = 0;
    }
  }
  return restante;
}

export function calcularLiberacao(dataBase: Date = new Date()): Date {
  return new Date(dataBase.getTime() + NOVENTA_DIAS_MS);
}

function sextaDaSemanaDe(data: Date): string {
  const dia = data.getDay();
  const diff = (dia - 5 + 7) % 7;
  const sexta = new Date(data);
  sexta.setHours(0, 0, 0, 0);
  sexta.setDate(data.getDate() - diff);
  return sexta.toISOString().slice(0, 10);
}

export async function getResumoCarteira(userId: string): Promise<ResumoFinanceiro> {
  await prisma.$transaction(async (tx) => {
    await sincronizarDistribuicoesDoUsuario(tx, userId);
    await reaplicarAutomaticamenteSeNecessario(tx, userId);
  });

  const agora = new Date();

  const [aplicacoes, creditos, saquesAtivos] = await Promise.all([
    // `omit: { comprovante: true }` — o comprovante (imagem do Pix) é bytea pesado que ninguém
    // usa aqui; sem isso, essa query (que roda em toda carga do painel) fica MUITO mais lenta
    // pra investidores com vários aportes.
    prisma.aplicacao.findMany({ where: { userId }, omit: { comprovante: true } }),
    prisma.creditoCarteira.findMany({ where: { userId } }),
    prisma.solicitacaoSaque.findMany({
      where: { userId, status: { in: ["SOLICITADO", "AGUARDANDO_PAGAMENTO"] } },
    }),
  ]);

  let capitalPrincipal = 0;
  let capitalCarencia = 0;
  let capitalDisponivel = 0;
  let valoresReaplicados = 0;
  let aportesEmAnalise = 0;

  for (const ap of aplicacoes) {
    if (ap.status === "AGUARDANDO_APROVACAO") {
      aportesEmAnalise += ap.valor;
      continue;
    }
    if (ap.status === "REJEITADA") continue;

    // Capital conta enquanto não RETIRADA — o saque só debita de fato (RETIRADA) quando o
    // admin aprova (ver aprovarSaque), não só quando é solicitado nem só quando é marcado
    // como pago no final. Antes da aprovação, ainda soma aqui (o "Em processamento"/"Saques
    // pendentes" já mostra o valor reservado separadamente).
    if (ap.status !== "RETIRADA") {
      capitalPrincipal += ap.valor;
      if (ap.status === "CONFIRMADA") {
        if (ap.liberaEm > agora) capitalCarencia += ap.valor;
        else capitalDisponivel += ap.valor;
      }
    }
    if (ap.origem === "REAPLICACAO" || ap.origem === "REAPLICACAO_AUTOMATICA") {
      valoresReaplicados += ap.valor;
    }
  }

  let distribuicoesAcumuladas = 0;
  let distribuicoesJaSaiu = 0;
  let distribuicoesDisponiveis = 0;
  let bonusIndicacao = 0;
  let incentivoLiderancaAcumulado = 0;
  let incentivoLiderancaDisponivel = 0;

  for (const c of creditos) {
    if (c.tipo === "RENDIMENTO") {
      distribuicoesAcumuladas += c.valor;
      // "Já saiu" (debitado de fato) só quando utilizadoEm é marcado — reaplicação marca na
      // hora; saque de rendimento marca quando o admin aprova (ver aprovarSaque). Só
      // reservado (solicitacaoSaqueId, ainda sem utilizadoEm) continua contando aqui.
      if (c.utilizadoEm) distribuicoesJaSaiu += c.valor;
      if (!c.utilizadoEm && !c.solicitacaoSaqueId) distribuicoesDisponiveis += c.valor;
      // Incentivo de liderança (0,10%/dia) já está incluso em distribuicoesAcumuladas/
      // distribuicoesDisponiveis acima (entra no mesmo saque/reaplicação de rendimento
      // normalmente) — aqui só separa o valor pra exibir à parte no resumo e no modal de
      // reaplicar do líder.
      if (c.origem.startsWith("Incentivo de liderança")) {
        incentivoLiderancaAcumulado += c.valor;
        if (!c.utilizadoEm && !c.solicitacaoSaqueId) incentivoLiderancaDisponivel += c.valor;
      }
    } else if (c.tipo === "BONUS") {
      if (!c.utilizadoEm && !c.solicitacaoSaqueId) bonusIndicacao += c.valor;
    }
  }

  const valoresEmProcessamento = saquesAtivos
    .filter((s) => s.status === "SOLICITADO")
    .reduce((acc, s) => acc + s.valor, 0);

  const saquesPendentes = saquesAtivos
    .filter((s) => s.status === "AGUARDANDO_PAGAMENTO")
    .reduce((acc, s) => acc + s.valor, 0);

  const proximaLote = aplicacoes
    .filter((ap) => ap.status === "CONFIRMADA" && ap.liberaEm > agora)
    .sort((a, b) => a.liberaEm.getTime() - b.liberaEm.getTime())[0];

  /** Rentabilidade do período (mês corrente, horário de Brasília) — soma o que foi creditado
   *  por Distribuição (diluída dia a dia) ou PLR Individual (creditado na hora). Automático:
   *  não depende de qual dos dois lançou o crédito. Fica de fora migração de saldo e ajuste
   *  manual do admin, que não são baseados em percentual e distorceriam o número. */
  const inicioMes = inicioDoMesBrasilia();
  const creditadoNoMes = creditos
    .filter(
      (c) =>
        c.tipo === "RENDIMENTO" &&
        c.criadoEm >= inicioMes &&
        (c.origem.startsWith("PLR manual") || c.origem.startsWith("Distribuição "))
    )
    .reduce((acc, c) => acc + c.valor, 0);
  const rentabilidadePeriodo = capitalPrincipal > 0 ? (creditadoNoMes / capitalPrincipal) * 100 : 0;

  const sextas = ultimasSextas(8);
  const totaisPorSemana = new Map<string, number>();
  for (const c of creditos) {
    if (c.tipo !== "RENDIMENTO") continue;
    const chave = sextaDaSemanaDe(c.criadoEm);
    totaisPorSemana.set(chave, (totaisPorSemana.get(chave) ?? 0) + c.valor);
  }
  const historicoRendimentos: PontoRendimento[] = sextas.map((data) => ({
    data,
    valor: totaisPorSemana.get(data.toISOString().slice(0, 10)) ?? 0,
  }));

  // Uma vez reaplicado ou sacado (aprovado), o valor sai da carteira de rendimento — não faz
  // sentido continuar contando como "Rendimentos" também, senão o mesmo dinheiro aparece
  // creditado em duas caixinhas ao mesmo tempo.
  const distribuicoesAcumuladasLiquido = Math.max(0, distribuicoesAcumuladas - distribuicoesJaSaiu);

  return {
    capitalPrincipal,
    capitalCarencia,
    capitalDisponivel,
    distribuicoesAcumuladas: distribuicoesAcumuladasLiquido,
    distribuicoesDisponiveis,
    bonusIndicacao,
    incentivoLiderancaAcumulado,
    incentivoLiderancaDisponivel,
    valoresReaplicados,
    valoresEmProcessamento,
    saquesPendentes,
    aportesEmAnalise,
    totalDoacoes: 0,
    rentabilidadePeriodo,
    proximaLiberacao: proximaLote?.liberaEm ?? null,
    historicoRendimentos,
  };
}

/**
 * Reserva lotes de capital liberado (fora de carência) para uma solicitação de saque,
 * dividindo lotes quando necessário. Deve ser chamada dentro de uma transação já aberta
 * pelo chamador (não abre transação própria, para evitar transações aninhadas).
 */
export async function reservarCapitalParaSaque(
  tx: TxClient,
  userId: string,
  valor: number,
  solicitacaoSaqueId: string
): Promise<void> {
  const disponiveis = await tx.aplicacao.findMany({
    where: { userId, status: "CONFIRMADA", liberaEm: { lte: new Date() } },
    orderBy: { criadoEm: "asc" },
    omit: { comprovante: true },
  });

  const restante = await consumirFIFO(
    disponiveis,
    valor,
    async (lote) => {
      await tx.aplicacao.update({
        where: { id: lote.id },
        data: { status: "SAQUE_SOLICITADO", solicitacaoSaqueId },
      });
    },
    async (lote, valorConsumido, valorRestanteNaLinha) => {
      const cheio = await tx.aplicacao.findUniqueOrThrow({ where: { id: lote.id } });
      await tx.aplicacao.update({
        where: { id: lote.id },
        data: { valor: valorRestanteNaLinha },
      });
      await tx.aplicacao.create({
        data: {
          userId,
          valor: valorConsumido,
          moeda: cheio.moeda,
          origem: cheio.origem,
          status: "SAQUE_SOLICITADO",
          criadoEm: cheio.criadoEm,
          liberaEm: cheio.liberaEm,
          solicitacaoSaqueId,
        },
      });
    }
  );

  if (restante > EPSILON) {
    throw new SaldoInsuficienteError("Saldo disponível insuficiente para este saque.");
  }
}

/**
 * Igual a `reservarCapitalParaSaque`, mas ignora a carência de 90 dias — usado só no saque
 * assistido do admin (ajuda quem tem dificuldade de sacar sozinho), que pode liberar o capital
 * antes do prazo por decisão do próprio admin, em qualquer dia/horário. Consome os lotes mais
 * antigos primeiro, estejam ou não liberados.
 */
export async function reservarCapitalParaSaqueAdmin(
  tx: TxClient,
  userId: string,
  valor: number,
  solicitacaoSaqueId: string
): Promise<void> {
  const lotes = await tx.aplicacao.findMany({
    where: { userId, status: "CONFIRMADA" },
    orderBy: { criadoEm: "asc" },
    omit: { comprovante: true },
  });

  const restante = await consumirFIFO(
    lotes,
    valor,
    async (lote) => {
      await tx.aplicacao.update({
        where: { id: lote.id },
        data: { status: "SAQUE_SOLICITADO", solicitacaoSaqueId },
      });
    },
    async (lote, valorConsumido, valorRestanteNaLinha) => {
      const cheio = await tx.aplicacao.findUniqueOrThrow({ where: { id: lote.id } });
      await tx.aplicacao.update({
        where: { id: lote.id },
        data: { valor: valorRestanteNaLinha },
      });
      await tx.aplicacao.create({
        data: {
          userId,
          valor: valorConsumido,
          moeda: cheio.moeda,
          origem: cheio.origem,
          status: "SAQUE_SOLICITADO",
          criadoEm: cheio.criadoEm,
          liberaEm: cheio.liberaEm,
          solicitacaoSaqueId,
        },
      });
    }
  );

  if (restante > EPSILON) {
    throw new SaldoInsuficienteError("Capital insuficiente pra esse saque (livre + em carência).");
  }
}

/**
 * Reserva créditos (rendimento) disponíveis para uma solicitação de saque, dividindo quando
 * necessário. Deve ser chamada dentro de uma transação já aberta pelo chamador.
 */
export async function reservarCreditosParaSaque(
  tx: TxClient,
  userId: string,
  valor: number,
  tipo: TipoCredito,
  solicitacaoSaqueId: string
): Promise<void> {
  const disponiveis = await tx.creditoCarteira.findMany({
    where: { userId, tipo, utilizadoEm: null, solicitacaoSaqueId: null },
    orderBy: { criadoEm: "asc" },
  });

  const restante = await consumirFIFO(
    disponiveis,
    valor,
    async (credito) => {
      await tx.creditoCarteira.update({
        where: { id: credito.id },
        data: { solicitacaoSaqueId },
      });
    },
    async (credito, valorConsumido, valorRestanteNaLinha) => {
      const cheio = await tx.creditoCarteira.findUniqueOrThrow({ where: { id: credito.id } });
      await tx.creditoCarteira.update({
        where: { id: credito.id },
        data: { valor: valorRestanteNaLinha },
      });
      await tx.creditoCarteira.create({
        data: {
          userId,
          tipo,
          valor: valorConsumido,
          moeda: cheio.moeda,
          origem: cheio.origem,
          criadoEm: cheio.criadoEm,
          solicitacaoSaqueId,
        },
      });
    }
  );

  if (restante > EPSILON) {
    throw new SaldoInsuficienteError("Saldo disponível insuficiente para este saque.");
  }
}

/**
 * Consome rendimento + bônus disponíveis (nessa ordem) e cria uma nova aplicação (novo lote,
 * nova carência). Deve ser chamada dentro de uma transação já aberta pelo chamador.
 */
export async function reaplicarSaldoDisponivel(
  tx: TxClient,
  userId: string,
  valor: number,
  automatica: boolean = false
): Promise<void> {
  // Nota: `orderBy: { tipo: "desc" }` NÃO garante RENDIMENTO antes de BONUS — enums nativos do
  // Postgres ordenam pelo ordinal declarado no `CREATE TYPE` (RENDIMENTO=1, BONUS=2), não
  // alfabeticamente, então "desc" traz BONUS primeiro. Por isso consome em duas passadas
  // separadas (RENDIMENTO, depois BONUS), cada uma FIFO por criadoEm — mesmo padrão de
  // `reservarCreditosParaSaque`.
  let restante = valor;
  for (const tipo of ["RENDIMENTO", "BONUS"] as const) {
    if (restante <= 0) break;
    const disponiveis = await tx.creditoCarteira.findMany({
      where: { userId, tipo, utilizadoEm: null, solicitacaoSaqueId: null },
      orderBy: { criadoEm: "asc" },
    });

    restante = await consumirFIFO(
      disponiveis,
      restante,
      async (credito) => {
        await tx.creditoCarteira.update({
          where: { id: credito.id },
          data: { utilizadoEm: new Date() },
        });
      },
      async (credito, _valorConsumido, valorRestanteNaLinha) => {
        const cheio = await tx.creditoCarteira.findUniqueOrThrow({ where: { id: credito.id } });
        await tx.creditoCarteira.update({
          where: { id: credito.id },
          data: { valor: valorRestanteNaLinha },
        });
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
  }

  if (restante > EPSILON) {
    throw new SaldoInsuficienteError("Saldo disponível insuficiente para reaplicação.");
  }

  await tx.aplicacao.create({
    data: {
      userId,
      valor,
      moeda: "BRL",
      origem: automatica ? "REAPLICACAO_AUTOMATICA" : "REAPLICACAO",
      status: "CONFIRMADA",
      liberaEm: calcularLiberacao(),
    },
  });
}

export const VALOR_MINIMO_REAPLICACAO = 100;

/** Se o investidor ligou a reaplicação automática, reaplica sozinho assim que o saldo
 *  disponível (rendimento + bônus, mesma soma que "Disponível para reaplicar" mostra na tela)
 *  atingir o mínimo — sem esperar ele clicar em "Reaplicar agora". Chamada de dentro de
 *  `getResumoCarteira`, então roda a cada carregamento do painel (mesmo padrão de
 *  `sincronizarDistribuicoesDoUsuario`, que já roda ali e credita o rendimento do dia antes
 *  desta função conferir o saldo). Não faz nada se o investidor não ligou a opção, ou se o
 *  saldo ainda não bateu o mínimo — nunca lança erro, só pula. */
export async function reaplicarAutomaticamenteSeNecessario(tx: TxClient, userId: string): Promise<void> {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { reaplicacaoAutomatica: true } });
  if (!user?.reaplicacaoAutomatica) return;

  const creditos = await tx.creditoCarteira.findMany({
    where: { userId, tipo: { in: ["RENDIMENTO", "BONUS"] }, utilizadoEm: null, solicitacaoSaqueId: null },
  });
  const disponivel = creditos.reduce((acc, c) => acc + c.valor, 0);
  if (disponivel < VALOR_MINIMO_REAPLICACAO) return;

  await reaplicarSaldoDisponivel(tx, userId, disponivel, true);
  await tx.logAuditoria.create({
    data: { userId, acao: "reaplicacao_automatica", detalhes: `R$ ${disponivel.toFixed(2)}` },
  });
}

/** Consome capital "livre" (lotes CONFIRMADA, mais antigos primeiro — mesma FIFO usada em todo
 *  o resto da carteira) até atingir `valor`, dividindo o último lote se necessário. Não olha
 *  carência (o admin pode transferir capital ainda em carência, igual já podia ajustar/apagar
 *  saldo manualmente) nem lotes já reservados num saque em andamento (esses não entram na
 *  busca, então nunca são tocados). Lança SaldoInsuficienteError se a origem não tiver capital
 *  livre suficiente. */
export async function reduzirCapitalLivre(tx: TxClient, userId: string, valor: number): Promise<void> {
  const lotes = await tx.aplicacao.findMany({
    where: { userId, status: "CONFIRMADA" },
    orderBy: { criadoEm: "asc" },
  });

  const restante = await consumirFIFO(
    lotes,
    valor,
    async (lote) => {
      await tx.aplicacao.delete({ where: { id: lote.id } });
    },
    async (lote, _valorConsumido, valorRestanteNoLote) => {
      await tx.aplicacao.update({ where: { id: lote.id }, data: { valor: valorRestanteNoLote } });
    }
  );

  if (restante > EPSILON) {
    throw new SaldoInsuficienteError("O investidor de origem não tem capital livre suficiente pra essa transferência.");
  }
}

/**
 * Move capital de um investidor pra outro, por decisão do admin — reduz o capital livre da
 * origem (FIFO, mesma lógica de qualquer redução de capital) e cria um lote novo (carência de
 * 90 dias, como qualquer capital novo) pro destino. Tudo dentro da mesma transação: ou as duas
 * pontas acontecem, ou nenhuma.
 */
export async function transferirCapitalEntreUsuarios(
  tx: TxClient,
  origemUserId: string,
  destinoUserId: string,
  valor: number
): Promise<void> {
  if (origemUserId === destinoUserId) {
    throw new Error("A origem e o destino da transferência não podem ser o mesmo investidor.");
  }
  if (!valor || valor <= 0) {
    throw new Error("Informe um valor válido para a transferência.");
  }

  await reduzirCapitalLivre(tx, origemUserId, valor);

  await tx.aplicacao.create({
    data: {
      userId: destinoUserId,
      valor,
      moeda: "BRL",
      origem: "TRANSFERENCIA",
      status: "CONFIRMADA",
      liberaEm: calcularLiberacao(),
    },
  });
}

export type DebitoServico = { rendimento: number; bonus: number; capital: number };

/** Debita uma cobrança de serviço (Pacotes de Serviços) do investidor, na ordem: rendimento
 *  disponível, depois bônus disponível e só então capital livre — mesma prioridade confirmada
 *  pra esse módulo. Igual a `reaplicarSaldoDisponivel`/`debitarSaldoDisponivelParaDoacao` nos
 *  dois primeiros passos (marca utilizadoEm, não cria capital novo), mas com um terceiro passo
 *  novo (capital, via `reduzirCapitalLivre`) quando rendimento+bônus não bastam. Devolve o
 *  quanto saiu de cada origem, pra registrar em CobrancaServico. Lança SaldoInsuficienteError se
 *  nem com capital der pra cobrir. */
export async function debitarSaldoParaServico(
  tx: TxClient,
  userId: string,
  valor: number
): Promise<DebitoServico> {
  let restante = valor;
  let rendimento = 0;
  let bonus = 0;

  for (const tipo of ["RENDIMENTO", "BONUS"] as const) {
    if (restante <= 0) break;
    const disponiveis = await tx.creditoCarteira.findMany({
      where: { userId, tipo, utilizadoEm: null, solicitacaoSaqueId: null },
      orderBy: { criadoEm: "asc" },
    });

    const antesDesteTipo = restante;
    restante = await consumirFIFO(
      disponiveis,
      restante,
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
    const consumidoNesteTipo = antesDesteTipo - restante;
    if (tipo === "RENDIMENTO") rendimento = consumidoNesteTipo;
    else bonus = consumidoNesteTipo;
  }

  let capital = 0;
  if (restante > EPSILON) {
    capital = restante;
    await reduzirCapitalLivre(tx, userId, restante); // lança SaldoInsuficienteError se faltar
  }

  return { rendimento, bonus, capital };
}

/** Credita o valor de uma cobrança de serviço na carteira interna da empresa (User perfil
 *  EMPRESA) — disponível na hora, sem carência de 90 dias (mesmo padrão de
 *  `creditarDoacaoNaEntidade`: carteira interna, não um investidor comum). */
export async function creditarPagamentoServicoNaEmpresa(
  tx: TxClient,
  empresaUserId: string,
  valor: number
): Promise<string> {
  const aplicacao = await tx.aplicacao.create({
    data: {
      userId: empresaUserId,
      valor,
      moeda: "BRL",
      origem: "PAGAMENTO_SERVICO",
      status: "CONFIRMADA",
      liberaEm: new Date(),
    },
  });
  return aplicacao.id;
}
