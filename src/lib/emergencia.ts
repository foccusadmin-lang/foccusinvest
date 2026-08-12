import { prisma } from "@/lib/prisma";
import { reservarCreditosParaSaque, consumirFIFO, SaldoInsuficienteError, type TxClient } from "@/lib/carteira";
import { getConfiguracao } from "@/lib/configuracao";
import { estimarSaqueEmergencial } from "@/lib/emergencia-calculo";
import type { TipoLiberacaoEmergencial } from "@prisma/client";

const EPSILON = 0.005;

export type AplicacaoElegivel = {
  id: string;
  valor: number;
  criadoEm: Date;
  liberaEm: Date;
  emCarencia: boolean;
};

/** Lotes (Aplicacao) do investidor ainda com capital de fato disponível pra liberação —
 *  CONFIRMADA (nem em saque em andamento, nem já retirada). */
export async function listarAplicacoesElegiveis(userId: string): Promise<AplicacaoElegivel[]> {
  const agora = new Date();
  const lotes = await prisma.aplicacao.findMany({
    where: { userId, status: "CONFIRMADA" },
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
