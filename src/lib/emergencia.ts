import { prisma } from "@/lib/prisma";
import {
  reservarCreditosParaSaque,
  reservarCapitalParaSaqueAdmin,
  getResumoCarteira,
  consumirFIFO,
  SaldoInsuficienteError,
  type TxClient,
} from "@/lib/carteira";
import { getConfiguracao } from "@/lib/configuracao";
import { estimarSaqueEmergencial } from "@/lib/emergencia-calculo";
import { usuarioTemServicoAtivo } from "@/lib/servicos-contratacao";
import { prepararDadosSaquePix, obterSnapshotInvestidor } from "@/lib/saque-pix";
import { arredondarParaCentavos } from "@/lib/valor-centavos";
import { adicionarDiasUteis } from "@/lib/datas";
import { formatMoeda } from "@/lib/format";
import { TAXA_SAQUE_CARENCIA, creditarTaxaSaqueCarencia } from "@/lib/taxa-saque-carencia";
import type { TipoLiberacaoEmergencial } from "@prisma/client";

const EPSILON = 0.005;

/** Prazo (dias úteis) do saque de emergência self-service de capital em carência. */
export const DIAS_UTEIS_LIBERACAO_EMERGENCIA_CARENCIA = 15;
const MENSAGEM_PEDIDO_JA_ENVIADO =
  "Esse pedido já tinha sido enviado — não foi duplicado. Confira o status em Histórico.";

export type AplicacaoElegivel = {
  id: string;
  valor: number;
  criadoEm: Date;
  liberaEm: Date;
  emCarencia: boolean;
};

/** Lotes (Aplicacao) do investidor ainda com capital de fato disponível pra liberação —
 *  CONFIRMADA (nem em saque em andamento, nem já retirada). Exclui USDT — o saque de emergência
 *  só sabe pagar via Pix (R$); sem esse filtro, o admin poderia acabar liberando um lote em USDT
 *  pra um saque que só gera Pix. */
export async function listarAplicacoesElegiveis(userId: string): Promise<AplicacaoElegivel[]> {
  const agora = new Date();
  const lotes = await prisma.aplicacao.findMany({
    where: { userId, status: "CONFIRMADA", moeda: { not: "USDT" } },
    orderBy: { criadoEm: "asc" },
    omit: { comprovante: true },
  });
  return lotes.map((l) => ({
    id: l.id,
    valor: l.valor,
    criadoEm: l.criadoEm,
    liberaEm: l.liberaEm,
    emCarencia: l.liberaEm > agora,
  }));
}

export type LiberarEmergenciaParams = {
  aplicacaoId: string;
  adminId: string;
  valorMaximo: number;
  tipoSaque: TipoLiberacaoEmergencial;
  expiraEm: Date;
  motivo: string;
  ip: string | null;
};

export async function criarLiberacaoEmergencial(
  params: LiberarEmergenciaParams
): Promise<{ error?: string; liberacaoId?: string }> {
  const { aplicacaoId, adminId, tipoSaque, motivo, ip } = params;
  let { valorMaximo, expiraEm } = params;

  if (!motivo || motivo.trim().length < 10) {
    return { error: "Descreva a justificativa da liberação (mínimo 10 caracteres) — fica registrada na auditoria." };
  }
  if (expiraEm.getTime() <= Date.now()) {
    return { error: "O prazo da autorização precisa ser uma data futura." };
  }

  const aplicacao = await prisma.aplicacao.findUnique({ where: { id: aplicacaoId } });
  if (!aplicacao) return { error: "Aplicação não encontrada." };
  if (aplicacao.status !== "CONFIRMADA") {
    return { error: "Essa aplicação não está mais disponível pra liberação (já foi sacada ou está em outro saque)." };
  }

  // Serviço "Saque de emergência" (Pacotes de Serviços) precisa estar contratado e ATIVO pra
  // esse investidor — sem ele, o admin não consegue criar a liberação, mesmo com todo o resto
  // preenchido corretamente (checagem no servidor, não só na tela).
  const temServicoAtivo = await usuarioTemServicoAtivo(aplicacao.userId, "SAQUE_EMERGENCIA");
  if (!temServicoAtivo) {
    return {
      error:
        "Esse investidor ainda não contratou o serviço \"Saque de emergência\" (Pacotes de Serviços) — não é possível liberar sem ele.",
    };
  }

  if (tipoSaque === "TOTAL") {
    valorMaximo = aplicacao.valor;
  } else {
    if (!valorMaximo || valorMaximo <= 0) {
      return { error: "Informe o valor máximo autorizado." };
    }
    if (valorMaximo > aplicacao.valor + EPSILON) {
      return { error: "O valor máximo não pode passar do valor da aplicação selecionada." };
    }
  }

  const liberacaoId = await prisma.$transaction(async (tx) => {
    // A liberação é individual por usuário — uma nova sempre substitui (cancela) qualquer outra
    // ainda ativa desse mesmo investidor, esteja ela vinculada à mesma aplicação ou não.
    const anteriores = await tx.liberacaoEmergencial.findMany({
      where: { userId: aplicacao.userId, status: "ATIVA" },
    });
    for (const anterior of anteriores) {
      await tx.liberacaoEmergencial.update({
        where: { id: anterior.id },
        data: { status: "CANCELADA", canceladoPorId: adminId, canceladoEm: new Date() },
      });
    }

    const nova = await tx.liberacaoEmergencial.create({
      data: {
        userId: aplicacao.userId,
        aplicacaoId,
        criadoPorId: adminId,
        valorMaximo,
        tipoSaque,
        motivo: motivo.trim(),
        expiraEm,
        ip,
      },
    });

    await tx.logAuditoria.create({
      data: {
        userId: adminId,
        ip,
        acao: "EMERGENCY_WITHDRAWAL_RELEASED",
        detalhes: JSON.stringify({
          event_type: "EMERGENCY_WITHDRAWAL_RELEASED",
          user_id: aplicacao.userId,
          investment_id: aplicacaoId,
          admin_id: adminId,
          maximum_authorized_amount: valorMaximo,
          withdrawal_type: tipoSaque,
          authorization_reason: motivo.trim(),
          authorization_created_at: nova.criadoEm.toISOString(),
          authorization_expires_at: expiraEm.toISOString(),
          authorization_status: "ATIVA",
          ip_address: ip,
        }),
      },
    });

    return nova.id;
  });

  return { liberacaoId };
}

export async function cancelarLiberacaoEmergencial(
  liberacaoId: string,
  adminId: string,
  ip: string | null
): Promise<{ error?: string }> {
  const liberacao = await prisma.liberacaoEmergencial.findUnique({ where: { id: liberacaoId } });
  if (!liberacao) return { error: "Liberação não encontrada." };
  if (liberacao.status !== "ATIVA") return { error: "Essa liberação não está mais ativa." };

  await prisma.$transaction(async (tx) => {
    await tx.liberacaoEmergencial.update({
      where: { id: liberacaoId },
      data: { status: "CANCELADA", canceladoPorId: adminId, canceladoEm: new Date() },
    });
    await tx.logAuditoria.create({
      data: {
        userId: adminId,
        ip,
        acao: "EMERGENCY_WITHDRAWAL_CANCELED",
        detalhes: JSON.stringify({
          event_type: "EMERGENCY_WITHDRAWAL_CANCELED",
          user_id: liberacao.userId,
          investment_id: liberacao.aplicacaoId,
          admin_id: adminId,
          authorization_status: "CANCELADA",
          ip_address: ip,
        }),
      },
    });
  });

  return {};
}

export type LiberacaoAtiva = {
  id: string;
  aplicacaoId: string;
  valorMaximo: number;
  tipoSaque: TipoLiberacaoEmergencial;
  motivo: string;
  expiraEm: Date;
  aplicacao: { valor: number; criadoEm: Date; liberaEm: Date };
};

/** Autorização ativa (e ainda dentro do prazo) do usuário, se existir. Se o prazo já passou,
 *  fecha sozinha como EXPIRADA (lazy expiration) e devolve null. */
export async function obterLiberacaoAtivaDoUsuario(userId: string): Promise<LiberacaoAtiva | null> {
  const liberacao = await prisma.liberacaoEmergencial.findFirst({
    where: { userId, status: "ATIVA" },
    include: { aplicacao: { select: { valor: true, criadoEm: true, liberaEm: true } } },
    orderBy: { criadoEm: "desc" },
  });
  if (!liberacao) return null;

  if (liberacao.expiraEm.getTime() <= Date.now()) {
    await prisma.$transaction(async (tx) => {
      await tx.liberacaoEmergencial.update({
        where: { id: liberacao.id },
        data: { status: "EXPIRADA" },
      });
      await tx.logAuditoria.create({
        data: {
          acao: "EMERGENCY_WITHDRAWAL_EXPIRED",
          detalhes: JSON.stringify({
            event_type: "EMERGENCY_WITHDRAWAL_EXPIRED",
            user_id: liberacao.userId,
            investment_id: liberacao.aplicacaoId,
            authorization_status: "EXPIRADA",
          }),
        },
      });
    });
    return null;
  }

  return {
    id: liberacao.id,
    aplicacaoId: liberacao.aplicacaoId,
    valorMaximo: liberacao.valorMaximo,
    tipoSaque: liberacao.tipoSaque,
    motivo: liberacao.motivo,
    expiraEm: liberacao.expiraEm,
    aplicacao: liberacao.aplicacao,
  };
}

/** Reserva exatamente o lote (Aplicacao) autorizado pela liberação de emergência — nunca outros
 *  lotes do investidor, mesmo que estejam livres — dividindo a linha se o saque for parcial. */
export async function reservarAplicacaoEspecificaParaSaque(
  tx: TxClient,
  aplicacaoId: string,
  valor: number,
  solicitacaoSaqueId: string
): Promise<void> {
  const lote = await tx.aplicacao.findUniqueOrThrow({ where: { id: aplicacaoId } });

  const restante = await consumirFIFO(
    [lote],
    valor,
    async () => {
      await tx.aplicacao.update({
        where: { id: lote.id },
        data: { status: "SAQUE_SOLICITADO", solicitacaoSaqueId },
      });
    },
    async (linha, valorConsumido, valorRestanteNaLinha) => {
      await tx.aplicacao.update({
        where: { id: linha.id },
        data: { valor: valorRestanteNaLinha },
      });
      await tx.aplicacao.create({
        data: {
          userId: lote.userId,
          valor: valorConsumido,
          moeda: lote.moeda,
          origem: lote.origem,
          status: "SAQUE_SOLICITADO",
          criadoEm: lote.criadoEm,
          liberaEm: lote.liberaEm,
          solicitacaoSaqueId,
        },
      });
    }
  );

  if (restante > EPSILON) {
    throw new SaldoInsuficienteError("A aplicação autorizada não tem mais esse valor disponível.");
  }
}

export type SolicitarSaqueEmergencialParams = {
  userId: string;
  liberacao: LiberacaoAtiva;
  capitalSolicitado: number;
  incluirRendimento: boolean;
  rendimentoDisponivel: number;
};

export async function executarSaqueEmergencial(
  params: SolicitarSaqueEmergencialParams
): Promise<{ error?: string; mensagem?: string }> {
  const { userId, liberacao, capitalSolicitado, incluirRendimento, rendimentoDisponivel } = params;

  if (!capitalSolicitado || capitalSolicitado <= 0) {
    return { error: "Informe um valor válido para o saque." };
  }
  if (capitalSolicitado > liberacao.valorMaximo + EPSILON) {
    return { error: "O valor solicitado passa do máximo autorizado pra essa liberação." };
  }

  const estimativa = estimarSaqueEmergencial(
    capitalSolicitado,
    rendimentoDisponivel,
    incluirRendimento,
    liberacao.aplicacao.criadoEm
  );

  const config = await getConfiguracao();
  const automaticoCapital = config.modoSaqueCapital === "AUTOMATICO";
  const automaticoRendimento = config.modoSaqueRendimento === "AUTOMATICO";

  try {
    await prisma.$transaction(async (tx) => {
      // Reconfirma dentro da transação que a liberação continua ATIVA — evita corrida com o
      // admin cancelando ao mesmo tempo, ou com outra aba usando a mesma liberação primeiro.
      const liberacaoAtual = await tx.liberacaoEmergencial.findUnique({ where: { id: liberacao.id } });
      if (!liberacaoAtual || liberacaoAtual.status !== "ATIVA") {
        throw new SaldoInsuficienteError("Essa liberação não está mais ativa.");
      }
      if (liberacaoAtual.expiraEm.getTime() <= Date.now()) {
        throw new SaldoInsuficienteError("O prazo dessa liberação já venceu.");
      }

      const saqueCapital = await tx.solicitacaoSaque.create({
        data: {
          userId,
          tipo: "CAPITAL",
          valor: capitalSolicitado,
          emergencial: true,
          motivoEmergencia: liberacaoAtual.motivo,
        },
      });
      await reservarAplicacaoEspecificaParaSaque(tx, liberacao.aplicacaoId, capitalSolicitado, saqueCapital.id);
      if (automaticoCapital) {
        await tx.aplicacao.updateMany({
          where: { solicitacaoSaqueId: saqueCapital.id },
          data: { status: "RETIRADA" },
        });
        await tx.solicitacaoSaque.update({
          where: { id: saqueCapital.id },
          data: { status: "PAGO", processadoEm: new Date() },
        });
      }

      let saqueRendimentoId: string | null = null;
      if (incluirRendimento && estimativa.rendimentoBruto > EPSILON) {
        const saqueRendimento = await tx.solicitacaoSaque.create({
          data: {
            userId,
            tipo: "RENDIMENTO",
            valor: estimativa.rendimentoLiquido,
            valorBruto: estimativa.rendimentoBruto,
            taxaAntecipacao: estimativa.descontoRendimento + estimativa.iof,
            emergencial: true,
            motivoEmergencia: liberacaoAtual.motivo,
          },
        });
        saqueRendimentoId = saqueRendimento.id;
        await reservarCreditosParaSaque(tx, userId, estimativa.rendimentoBruto, "RENDIMENTO", saqueRendimento.id);
        if (automaticoRendimento) {
          await tx.creditoCarteira.updateMany({
            where: { solicitacaoSaqueId: saqueRendimento.id },
            data: { utilizadoEm: new Date() },
          });
          await tx.solicitacaoSaque.update({
            where: { id: saqueRendimento.id },
            data: { status: "PAGO", processadoEm: new Date() },
          });
        }
      }

      await tx.liberacaoEmergencial.update({
        where: { id: liberacao.id },
        data: { status: "UTILIZADA", solicitacaoSaqueId: saqueCapital.id },
      });
      if (saqueRendimentoId) {
        await tx.solicitacaoSaque.update({
          where: { id: saqueCapital.id },
          data: { solicitacaoSaqueRendimentoId: saqueRendimentoId },
        });
      }

      await tx.logAuditoria.create({
        data: {
          userId,
          acao: "EMERGENCY_WITHDRAWAL_USED",
          detalhes: JSON.stringify({
            event_type: "EMERGENCY_WITHDRAWAL_USED",
            user_id: userId,
            investment_id: liberacao.aplicacaoId,
            authorization_id: liberacao.id,
            capital_amount: capitalSolicitado,
            rendimento_bruto: estimativa.rendimentoBruto,
            desconto_rendimento: estimativa.descontoRendimento,
            iof: estimativa.iof,
            valor_liquido: estimativa.valorLiquido,
            authorization_status: "UTILIZADA",
          }),
        },
      });
    });
  } catch (e) {
    if (e instanceof SaldoInsuficienteError) return { error: e.message };
    throw e;
  }

  const automatico = automaticoCapital && (!incluirRendimento || automaticoRendimento);
  return {
    mensagem: automatico
      ? `Saque de emergência processado. Valor líquido: ${estimativa.valorLiquido.toFixed(2)}.`
      : `Saque de emergência solicitado. Valor líquido estimado: ${estimativa.valorLiquido.toFixed(2)}. Aguarde aprovação.`,
  };
}

export type SaqueEmergenciaCarenciaParams = {
  userId: string;
  valorBruto: number;
  chavePixTexto: string;
  chavePixTipo: string;
  idempotencyKey: string | null;
};

/**
 * Saque de emergência self-service: com o serviço "Saque de emergência" ATIVO, o investidor saca
 * capital ainda em carência sem depender de uma liberação individual do admin. O valor BRUTO sai
 * integralmente do capital, o Pix pago sai 15% menor (a taxa vira fundo de caixa) e a liberação
 * leva 15 dias úteis: no modo manual o admin confirma em /restrito/saques; no automático o cron
 * (liberarSaquesEmergenciaCarenciaVencidos) reserva/debita sozinho ao vencer o prazo — nunca marca
 * como PAGO, o Pix continua sendo enviado/confirmado pelo admin. Sem restrição de dia/horário
 * (saque de emergência existe pra contornar as regras normais).
 */
export async function executarSaqueEmergenciaCarencia(
  params: SaqueEmergenciaCarenciaParams
): Promise<{ error?: string; sucesso?: string }> {
  const { userId, valorBruto, chavePixTexto, chavePixTipo, idempotencyKey } = params;

  if (!valorBruto || valorBruto <= 0 || Number.isNaN(valorBruto)) {
    return { error: "Informe um valor válido." };
  }

  const temServicoAtivo = await usuarioTemServicoAtivo(userId, "SAQUE_EMERGENCIA");
  if (!temServicoAtivo) {
    return { error: "Contrate o serviço \"Saque de emergência\" em Pacotes de Serviços pra usar essa opção." };
  }

  if (idempotencyKey) {
    const existente = await prisma.solicitacaoSaque.findUnique({ where: { idempotencyKey } });
    if (existente) return { sucesso: MENSAGEM_PEDIDO_JA_ENVIADO };
  }

  const resumo = await getResumoCarteira(userId);
  if (valorBruto > resumo.capitalCarencia + EPSILON) {
    return { error: "O valor não pode passar do seu capital ainda em carência." };
  }

  const taxaAntecipacao = arredondarParaCentavos(valorBruto * TAXA_SAQUE_CARENCIA);
  const valorAPagar = arredondarParaCentavos(valorBruto - taxaAntecipacao);

  const { nome: investidorNome, email: investidorEmail } = await obterSnapshotInvestidor(userId);
  const preparo = await prepararDadosSaquePix({
    investidorNome,
    investidorEmail,
    valor: valorAPagar,
    chavePixTexto,
    chavePixTipo,
  });
  if (!preparo.ok) return { error: preparo.error };
  const dados = preparo.dados;

  const liberacaoAutomaticaEm = adicionarDiasUteis(DIAS_UTEIS_LIBERACAO_EMERGENCIA_CARENCIA);

  try {
    await prisma.$transaction(async (tx) => {
      const saque = await tx.solicitacaoSaque.create({
        data: {
          userId,
          tipo: "CAPITAL",
          valor: dados.valorFinal,
          moeda: "BRL",
          emergencial: true,
          motivoEmergencia: "Saque de emergência (capital em carência) — serviço contratado",
          valorBruto,
          taxaAntecipacao,
          liberacaoAutomaticaEm,
          investidorNome: dados.investidorNome,
          investidorEmail: dados.investidorEmail,
          chavePixOriginal: dados.chavePixOriginal,
          chavePixNormalizada: dados.chavePixNormalizada,
          chavePixTipo: dados.chavePixTipo,
          pixPayload: dados.pixPayload,
          pixQrCodePng: dados.pixQrCodePng,
          pixTxid: dados.pixTxid,
          dataProgramadaPagamento: liberacaoAutomaticaEm,
          idempotencyKey,
        },
      });
      await reservarCapitalParaSaqueAdmin(tx, userId, valorBruto, saque.id);
      await creditarTaxaSaqueCarencia(tx, investidorNome, taxaAntecipacao);
      await tx.logAuditoria.create({
        data: {
          userId,
          acao: "saque_emergencia_carencia_solicitado",
          detalhes: `${saque.id} | bruto ${valorBruto.toFixed(2)} | taxa ${taxaAntecipacao.toFixed(2)} | liberação ${liberacaoAutomaticaEm.toISOString().slice(0, 10)}`,
        },
      });
    });
  } catch (e) {
    if (e instanceof SaldoInsuficienteError) return { error: e.message };
    if (idempotencyKey && typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002") {
      return { sucesso: MENSAGEM_PEDIDO_JA_ENVIADO };
    }
    throw e;
  }

  return {
    sucesso: `Saque de emergência solicitado: você recebe ${formatMoeda(valorAPagar)} (valor ${formatMoeda(valorBruto)} menos taxa de 15% de ${formatMoeda(taxaAntecipacao)}). Liberação em até ${DIAS_UTEIS_LIBERACAO_EMERGENCIA_CARENCIA} dias úteis.`,
  };
}

/** Modo automático de saque de capital: ao vencer os 15 dias úteis, o saque de emergência
 *  self-service ainda SOLICITADO vira AGUARDANDO_PAGAMENTO (lotes reservados viram RETIRADA) —
 *  mesmo passo de aprovarSaque, sem admin. No modo manual não faz nada. Idempotente (só pega
 *  SOLICITADO); chamada pelo cron e como fallback do layout administrativo. */
export async function liberarSaquesEmergenciaCarenciaVencidos(
  agora: Date = new Date()
): Promise<{ processados: number }> {
  const config = await getConfiguracao();
  if (config.modoSaqueCapital !== "AUTOMATICO") return { processados: 0 };

  const vencidos = await prisma.solicitacaoSaque.findMany({
    where: { status: "SOLICITADO", liberacaoAutomaticaEm: { not: null, lte: agora } },
    select: { id: true, userId: true },
  });

  for (const saque of vencidos) {
    await prisma.$transaction(async (tx) => {
      const atualizado = await tx.solicitacaoSaque.updateMany({
        where: { id: saque.id, status: "SOLICITADO" },
        data: { status: "AGUARDANDO_PAGAMENTO" },
      });
      if (atualizado.count === 0) return;
      await tx.aplicacao.updateMany({
        where: { solicitacaoSaqueId: saque.id },
        data: { status: "RETIRADA" },
      });
      await tx.logAuditoria.create({
        data: {
          userId: saque.userId,
          acao: "saque_emergencia_carencia_liberado_automatico",
          detalhes: saque.id,
        },
      });
    });
  }

  return { processados: vencidos.length };
}
