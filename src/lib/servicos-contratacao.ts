import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  debitarSaldoParaServico,
  creditarPagamentoServicoNaEmpresa,
  SaldoInsuficienteError,
  type TxClient,
} from "@/lib/carteira";
import {
  TARIFA_CENTAVOS,
  NOME_SERVICO,
  DESCRICAO_SERVICO,
  ORDEM_SERVICOS,
  CODIGOS_PACOTE_COMPLETO,
  centavosParaReais,
  calcularContratacaoIndividual,
  calcularPacoteCompleto,
  META_INDICADOS_LIDERANCA,
  CARTEIRA_DESTINO_NOME,
  CARTEIRA_DESTINO_CODIGO,
  CONTATO_WHATSAPP_PADRAO,
  MENSAGEM_WHATSAPP_PADRAO,
} from "@/lib/servicos";
import type { CodigoServico, FormaContratacaoServico, StatusServicoUsuario } from "@prisma/client";

const TAMANHO_MAXIMO_TXID = 25;
function gerarTxidServico(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const aleatorio = randomUUID().replace(/-/g, "").toUpperCase();
  return `SRV${timestamp}${aleatorio}`.slice(0, TAMANHO_MAXIMO_TXID);
}

/** Encontra o id do usuário que recebe os pagamentos de Pacotes de Serviços — a conta já
 *  existente na plataforma (Grupo WD / WD INSIGHT RODRIGUES SOLUCOES E CONSULTORIA LTDA),
 *  localizada pelo código de indicação, que é único (documento, seção 5: mesma carteira
 *  sempre). Não é um cadastro novo — não cria nada, só localiza. */
export async function obterEmpresaUserId(): Promise<string> {
  const empresa = await prisma.user.findUnique({
    where: { codigoIndicacao: CARTEIRA_DESTINO_CODIGO },
    select: { id: true },
  });
  if (!empresa) {
    throw new Error(
      `Não encontrei a conta destino dos pagamentos de serviço (código ${CARTEIRA_DESTINO_CODIGO}).`
    );
  }
  return empresa.id;
}

/** Conta indicados diretos ativos pro Plano de Liderança (documento, seção 6.8): vinculados
 *  diretamente ao código do titular, com cadastro aprovado. Cada linha do banco já é única (não
 *  há duplicidade possível) e cancelado/bloqueado não usa o status APROVADO — então checar só
 *  `statusCadastro: "APROVADO"` já cobre as exclusões pedidas no documento. */
export async function contarIndicadosDiretosAtivos(userId: string): Promise<number> {
  return prisma.user.count({ where: { indicadoPorId: userId, statusCadastro: "APROVADO" } });
}

/** Confere, no servidor, se o usuário tem um serviço específico ATIVO — usado pra travar
 *  funcionalidades que dependem de contratação (documento: "Impedir acesso a serviços não
 *  contratados"). Nunca confia só na tela. */
export async function usuarioTemServicoAtivo(userId: string, codigo: CodigoServico): Promise<boolean> {
  const contrato = await prisma.contratoServico.findFirst({
    where: { userId, status: "ATIVO", servico: { codigo } },
    select: { id: true },
  });
  return contrato !== null;
}

export type ServicoComStatus = {
  servicoId: string;
  codigo: CodigoServico;
  nome: string;
  descricao: string;
  tarifaCentavos: number;
  contatoWhatsapp: string | null;
  mensagemPadrao: string | null;
  status: StatusServicoUsuario;
  formaContratacao: FormaContratacaoServico | null;
  contratadoEm: Date | null;
  ativadoEm: Date | null;
  desativadoEm: Date | null;
};

/** Sobe o Plano de Liderança de "aguardando elegibilidade" pra "ativo" assim que o usuário
 *  atingir a meta — chamada de dentro de `obterCatalogoComStatus`, mesmo padrão de
 *  `reaplicarAutomaticamenteSeNecessario` (roda a cada carregamento da tela, sem precisar de job
 *  agendado). Nunca faz o caminho inverso (perder elegibilidade não desativa o serviço). */
async function verificarElegibilidadeLideranca(tx: TxClient, userId: string, servicoLiderancaId: string) {
  const contrato = await tx.contratoServico.findUnique({
    where: { userId_servicoId: { userId, servicoId: servicoLiderancaId } },
  });
  if (!contrato || contrato.status !== "CONTRATADO_AGUARDANDO_ELEGIBILIDADE") return;

  const diretosAtivos = await contarIndicadosDiretosAtivos(userId);
  if (diretosAtivos < META_INDICADOS_LIDERANCA) return;

  await tx.contratoServico.update({
    where: { id: contrato.id },
    data: { status: "ATIVO", ativadoEm: new Date() },
  });
  await tx.logAuditoria.create({
    data: {
      userId,
      acao: "servico_lideranca_liberado_por_meta",
      detalhes: `Meta de ${META_INDICADOS_LIDERANCA} indicados diretos ativos atingida (${diretosAtivos}).`,
    },
  });
}

/** Catálogo completo com o status de cada serviço pra este usuário — usado pra montar a tela
 *  "Pacotes de Serviços". Cria linhas de catálogo que porventura faltem (proteção; o normal é o
 *  seed já ter criado as 8). */
export async function obterCatalogoComStatus(userId: string): Promise<ServicoComStatus[]> {
  const catalogo = await prisma.servicoPacote.findMany();
  const porCodigo = new Map(catalogo.map((s) => [s.codigo, s]));

  // Protege contra catálogo incompleto (seed não rodou pra algum serviço novo) sem quebrar a
  // tela — mostra a tarifa oficial mesmo sem linha no banco ainda.
  const faltantes = ORDEM_SERVICOS.filter((c) => !porCodigo.has(c));
  if (faltantes.length > 0) {
    const criados = await prisma.$transaction(
      faltantes.map((codigo) =>
        prisma.servicoPacote.upsert({
          where: { codigo },
          update: {},
          create: {
            codigo,
            nome: NOME_SERVICO[codigo],
            descricao: DESCRICAO_SERVICO[codigo],
            tarifa: centavosParaReais(TARIFA_CENTAVOS[codigo]),
            ordem: ORDEM_SERVICOS.indexOf(codigo),
            contatoWhatsapp: CONTATO_WHATSAPP_PADRAO[codigo] ?? null,
            mensagemPadrao: CONTATO_WHATSAPP_PADRAO[codigo] ? MENSAGEM_WHATSAPP_PADRAO : null,
          },
        })
      )
    );
    for (const c of criados) porCodigo.set(c.codigo, c);
  }

  const servicoLideranca = porCodigo.get("PLANO_LIDERANCA")!;
  const contratos = await prisma.$transaction(async (tx) => {
    await verificarElegibilidadeLideranca(tx, userId, servicoLideranca.id);
    return tx.contratoServico.findMany({ where: { userId } });
  });
  const contratoPorServicoId = new Map(contratos.map((c) => [c.servicoId, c]));

  return ORDEM_SERVICOS.map((codigo) => {
    const servico = porCodigo.get(codigo)!;
    const contrato = contratoPorServicoId.get(servico.id);
    return {
      servicoId: servico.id,
      codigo,
      nome: servico.nome,
      descricao: servico.descricao,
      tarifaCentavos: Math.round(servico.tarifa * 100),
      contatoWhatsapp: servico.contatoWhatsapp,
      mensagemPadrao: servico.mensagemPadrao,
      status: contrato?.status ?? "DISPONIVEL",
      formaContratacao: contrato?.formaContratacao ?? null,
      contratadoEm: contrato?.contratadoEm ?? null,
      ativadoEm: contrato?.ativadoEm ?? null,
      desativadoEm: contrato?.desativadoEm ?? null,
    };
  });
}

const STATUS_BLOQUEIAM_RECONTRATACAO: StatusServicoUsuario[] = [
  "ATIVO",
  "CONTRATADO",
  "CONTRATADO_AGUARDANDO_ELEGIBILIDADE",
  "PAGAMENTO_PENDENTE",
  "AGUARDANDO_CONFIRMACAO",
];

export class ServicoJaContratadoError extends Error {}

/**
 * Processa a contratação de um ou mais serviços (avulso) ou do pacote completo (mensal/anual),
 * seguindo o fluxo do documento (seção 4): debita rendimento→bônus→capital, credita a carteira
 * da empresa, registra a cobrança e ativa (ou marca "aguardando elegibilidade", pro Plano de
 * Liderança) cada serviço — tudo numa única transação. Idempotente via `idempotencyKey`.
 */
export async function contratarServicos(
  userId: string,
  codigos: CodigoServico[],
  forma: FormaContratacaoServico,
  idempotencyKey: string
): Promise<{ error?: string; cobrancaId?: string }> {
  if (codigos.length === 0) return { error: "Selecione pelo menos um serviço." };

  const existente = await prisma.cobrancaServico.findUnique({ where: { idempotencyKey } });
  if (existente) return { cobrancaId: existente.id };

  const ehPacoteCompleto =
    forma !== "INDIVIDUAL" &&
    codigos.length === CODIGOS_PACOTE_COMPLETO.length &&
    CODIGOS_PACOTE_COMPLETO.every((c) => codigos.includes(c));

  if ((forma === "PACOTE_MENSAL" || forma === "PACOTE_ANUAL") && !ehPacoteCompleto) {
    return { error: "O desconto de pacote completo só se aplica contratando os 8 serviços juntos." };
  }

  const resumo = ehPacoteCompleto
    ? calcularPacoteCompleto(forma as "PACOTE_MENSAL" | "PACOTE_ANUAL")
    : calcularContratacaoIndividual(codigos);

  const valorFinal = centavosParaReais(resumo.valorFinalCentavos);

  try {
    const cobrancaId = await prisma.$transaction(async (tx) => {
      const catalogo = await tx.servicoPacote.findMany({ where: { codigo: { in: codigos } } });
      if (catalogo.length !== codigos.length) {
        throw new Error("Um ou mais serviços selecionados não existem no catálogo.");
      }

      const contratosAtuais = await tx.contratoServico.findMany({
        where: { userId, servicoId: { in: catalogo.map((s) => s.id) } },
      });
      const jaContratado = contratosAtuais.find((c) => STATUS_BLOQUEIAM_RECONTRATACAO.includes(c.status));
      if (jaContratado) {
        const servico = catalogo.find((s) => s.id === jaContratado.servicoId);
        throw new ServicoJaContratadoError(
          `"${servico?.nome ?? "Serviço"}" já está contratado (${jaContratado.status}).`
        );
      }

      const empresaUserId = await obterEmpresaUserId();

      const debito = await debitarSaldoParaServico(tx, userId, valorFinal);
      await creditarPagamentoServicoNaEmpresa(tx, empresaUserId, valorFinal);

      const cobranca = await tx.cobrancaServico.create({
        data: {
          userId,
          servicosCodigos: JSON.stringify(codigos),
          formaContratacao: forma,
          valorBruto: centavosParaReais(resumo.subtotalCentavos),
          percentualDesconto: ehPacoteCompleto
            ? Math.round((resumo.descontoCentavos / resumo.subtotalCentavos) * 10000) / 100
            : 0,
          valorDesconto: centavosParaReais(resumo.descontoCentavos),
          valorFinal,
          origemRendimento: debito.rendimento,
          origemBonus: debito.bonus,
          origemCapital: debito.capital,
          carteiraDestinoNome: CARTEIRA_DESTINO_NOME,
          codigoCarteiraDestino: CARTEIRA_DESTINO_CODIGO,
          status: "CONFIRMADA",
          idempotencyKey,
          txid: gerarTxidServico(),
          processadoEm: new Date(),
        },
      });

      const diretosAtivos = await contarIndicadosDiretosAtivos(userId);

      for (const servico of catalogo) {
        const contratoExistente = contratosAtuais.find((c) => c.servicoId === servico.id);
        const ehLideranca = servico.codigo === "PLANO_LIDERANCA";
        const elegivelDeImediato = !ehLideranca || diretosAtivos >= META_INDICADOS_LIDERANCA;
        const agora = new Date();

        await tx.contratoServico.upsert({
          where: { userId_servicoId: { userId, servicoId: servico.id } },
          create: {
            userId,
            servicoId: servico.id,
            status: elegivelDeImediato ? "ATIVO" : "CONTRATADO_AGUARDANDO_ELEGIBILIDADE",
            formaContratacao: forma,
            contratadoEm: agora,
            ativadoEm: elegivelDeImediato ? agora : null,
          },
          update: {
            status: elegivelDeImediato ? "ATIVO" : "CONTRATADO_AGUARDANDO_ELEGIBILIDADE",
            formaContratacao: forma,
            contratadoEm: agora,
            ativadoEm: elegivelDeImediato ? agora : null,
            desativadoEm: null,
          },
        });

        void contratoExistente; // só pra clareza — upsert já cobre criar/atualizar
      }

      await tx.logAuditoria.create({
        data: {
          userId,
          acao: "servico_contratado",
          detalhes: `${forma} · ${codigos.join(", ")} · R$ ${valorFinal.toFixed(2)} · cobrança ${cobranca.id}`,
        },
      });

      return cobranca.id;
    });

    return { cobrancaId };
  } catch (err) {
    if (err instanceof SaldoInsuficienteError) {
      return { error: "Saldo disponível (rendimento, bônus e capital livre) insuficiente para essa contratação." };
    }
    if (err instanceof ServicoJaContratadoError) {
      return { error: err.message };
    }
    throw err;
  }
}

/** Desativa um serviço já ativo (ou cancela um que ainda aguardava elegibilidade) — sem estorno
 *  automático (documento, seção 7): a cobrança já feita permanece intacta no histórico, só o
 *  status individual muda e a funcionalidade correspondente passa a ficar oculta/bloqueada de
 *  novo. Efeito imediato. */
export async function desativarServico(userId: string, servicoId: string): Promise<{ error?: string }> {
  const contrato = await prisma.contratoServico.findUnique({ where: { userId_servicoId: { userId, servicoId } } });
  if (!contrato) return { error: "Serviço não contratado." };
  if (contrato.status !== "ATIVO" && contrato.status !== "CONTRATADO_AGUARDANDO_ELEGIBILIDADE") {
    return { error: "Este serviço não está ativo." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.contratoServico.update({
      where: { id: contrato.id },
      data: {
        status: contrato.status === "CONTRATADO_AGUARDANDO_ELEGIBILIDADE" ? "CANCELADO" : "INATIVO",
        desativadoEm: new Date(),
      },
    });
    await tx.logAuditoria.create({
      data: { userId, acao: "servico_desativado", detalhes: `Serviço ${servicoId}` },
    });
  });

  return {};
}
