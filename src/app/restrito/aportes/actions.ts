"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calcularLiberacao } from "@/lib/carteira";
import { calcularLiberacaoBem } from "@/lib/bens";
import {
  extrairCodigoIndicadorPendente,
  creditarBonusIndicacaoPorCodigo,
  creditarBonusIndicacaoPorAporte,
} from "@/lib/indicacao";
import { notificarAporteConfirmado } from "@/lib/notificacoes";
import { getConfiguracao } from "@/lib/configuracao";
import { valorPorExtenso } from "@/lib/valor-extenso";
import { enviarEmailContrato } from "@/lib/email";

export type AporteAcaoState = { error?: string; sucesso?: string } | undefined;

/** Ajuste feito pelo admin ao confirmar um aporte em bem (imóvel/automóvel/eletrônico) — o valor
 *  declarado pelo investidor e a carência padrão da categoria só viram definitivos aqui, depois
 *  do admin avaliar o bem entregue em mãos. */
export type AjusteBem = { valor: number; mesesCarencia: number };

export async function aprovarAporte(id: string, ajusteBem?: AjusteBem) {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") throw new Error("Acesso negado.");

  const aplicacao = await prisma.aplicacao.findUnique({ where: { id } });
  if (!aplicacao || aplicacao.status !== "AGUARDANDO_APROVACAO") {
    throw new Error("Este aporte não está mais aguardando aprovação.");
  }
  if (ajusteBem) {
    if (!aplicacao.categoriaBem) {
      throw new Error("Esse aporte não é em bem — não aceita ajuste de valor/carência.");
    }
    if (!ajusteBem.valor || ajusteBem.valor <= 0) {
      throw new Error("Informe um valor final válido.");
    }
    if (!ajusteBem.mesesCarencia || ajusteBem.mesesCarencia <= 0) {
      throw new Error("Informe uma carência (em meses) válida.");
    }
  }

  const codigoIndicador = extrairCodigoIndicadorPendente(aplicacao.motivoRejeicao);
  const config = await getConfiguracao();

  const valorFinal = ajusteBem ? ajusteBem.valor : aplicacao.valor;
  const liberaEmFinal = ajusteBem ? calcularLiberacaoBem(ajusteBem.mesesCarencia) : calcularLiberacao();

  // Aporte em bem nunca gerou contrato na solicitação (o valor só fica definitivo agora, depois
  // da avaliação) — busca os dados do investidor antes da transação pra montar e gravar o
  // contrato junto com a confirmação.
  const usuario = ajusteBem
    ? await prisma.user.findUnique({
        where: { id: aplicacao.userId },
        include: { pessoaFisica: true, pessoaJuridica: true },
      })
    : null;

  const dadosContrato =
    usuario && (usuario.pessoaFisica || usuario.pessoaJuridica)
      ? {
          nome: usuario.pessoaFisica?.nomeCompleto ?? usuario.pessoaJuridica!.representanteLegal,
          email: usuario.email,
          cpf: usuario.pessoaFisica?.cpf ?? usuario.pessoaJuridica!.cpfRepresentante,
          rg: usuario.pessoaFisica?.rg ?? usuario.pessoaJuridica?.rgRepresentante ?? null,
          nacionalidade:
            usuario.pessoaFisica?.nacionalidade ?? usuario.pessoaJuridica?.nacionalidadeRepresentante ?? null,
          estadoCivil:
            usuario.pessoaFisica?.estadoCivil ?? usuario.pessoaJuridica?.estadoCivilRepresentante ?? null,
          profissao: usuario.pessoaFisica?.profissao ?? usuario.pessoaJuridica?.profissaoRepresentante ?? null,
          telefone: usuario.pessoaFisica?.telefone ?? usuario.pessoaJuridica?.telefone ?? null,
          endereco: usuario.pessoaFisica?.endereco ?? usuario.pessoaJuridica?.endereco ?? null,
          valorExtenso: valorPorExtenso(valorFinal),
        }
      : null;

  await prisma.$transaction(async (tx) => {
    await tx.aplicacao.update({
      where: { id },
      data: {
        status: "CONFIRMADA",
        valor: valorFinal,
        liberaEm: liberaEmFinal,
        aprovadoPorId: session.user.id,
        aprovadoEm: new Date(),
        motivoRejeicao: null,
      },
    });

    if (codigoIndicador) {
      // Código digitado (primeiro aporte, ou já fixado — ver painel/page.tsx): sempre credita e
      // fixa o vínculo de indicação, em qualquer modo.
      await creditarBonusIndicacaoPorCodigo(tx, {
        codigoIndicador,
        aplicacaoId: aplicacao.id,
        aportanteUserId: aplicacao.userId,
        valorAporte: valorFinal,
      });
    } else if (config.modoBonusIndicacao === "AUTOMATICO") {
      // Sem código nesse aporte (não é o primeiro) — no modo automático, libera sozinho usando
      // o vínculo de indicação já fixado no cadastro. No modo manual, fica pra o admin liberar
      // depois pelo botão em Aportes (ver liberarBonusIndicacaoManual).
      await creditarBonusIndicacaoPorAporte(tx, {
        aplicacaoId: aplicacao.id,
        aportanteUserId: aplicacao.userId,
        valorAporte: valorFinal,
      });
    }

    if (dadosContrato) {
      await tx.contrato.create({
        data: {
          userId: aplicacao.userId,
          aplicacaoId: aplicacao.id,
          ...dadosContrato,
          valor: valorFinal,
          confirmouLeituraEm: new Date(),
        },
      });
    }
  });

  await prisma.logAuditoria.create({
    data: {
      userId: session.user.id,
      acao: "aprovar_aporte",
      detalhes: ajusteBem
        ? `${id} | bem avaliado: valor=${valorFinal}, carência=${ajusteBem.mesesCarencia} meses`
        : id,
    },
  });

  if (dadosContrato) {
    await enviarEmailContrato({ ...dadosContrato, valor: valorFinal, data: new Date() });
  }

  // Fora da transação de propósito: e-mail/WhatsApp são best-effort (nunca lançam erro) e não
  // devem fazer a confirmação do aporte esperar nem, muito menos, reverter se falharem.
  await notificarAporteConfirmado(aplicacao.userId, valorFinal);

  revalidatePath("/restrito/aportes");
  revalidatePath("/restrito/painel");
  revalidatePath("/painel");
}

export async function rejeitarAporte(id: string, motivo: string) {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") throw new Error("Acesso negado.");

  const aplicacao = await prisma.aplicacao.findUnique({ where: { id } });
  if (!aplicacao || aplicacao.status !== "AGUARDANDO_APROVACAO") {
    throw new Error("Este aporte não está mais aguardando aprovação.");
  }

  await prisma.aplicacao.update({
    where: { id },
    data: {
      status: "REJEITADA",
      motivoRejeicao: motivo || "Comprovante não confere.",
      aprovadoPorId: session.user.id,
      aprovadoEm: new Date(),
    },
  });

  await prisma.logAuditoria.create({
    data: { userId: session.user.id, acao: "rejeitar_aporte", detalhes: `${id} | ${motivo}` },
  });

  revalidatePath("/restrito/aportes");
  revalidatePath("/restrito/painel");
}

/** Pra quando o investidor esquece de colocar o código na hora do aporte — admin adiciona
 *  depois, sobre um aporte já confirmado. Só funciona uma vez por aporte (ver
 *  creditarBonusIndicacaoPorCodigo, que é idempotente por aplicacaoId). */
export async function adicionarIndicacaoRetroativa(
  aplicacaoId: string,
  codigoIndicador: string
): Promise<{ error?: string; sucesso?: string }> {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") return { error: "Acesso negado." };

  const aplicacao = await prisma.aplicacao.findUnique({ where: { id: aplicacaoId } });
  if (!aplicacao) return { error: "Aporte não encontrado." };
  if (aplicacao.status !== "CONFIRMADA") {
    return { error: "Só é possível adicionar indicação em aportes já confirmados." };
  }

  const resultado = await prisma.$transaction((tx) =>
    creditarBonusIndicacaoPorCodigo(tx, {
      codigoIndicador,
      aplicacaoId: aplicacao.id,
      aportanteUserId: aplicacao.userId,
      valorAporte: aplicacao.valor,
    })
  );
  if (resultado.error) return { error: resultado.error };

  await prisma.logAuditoria.create({
    data: {
      userId: session.user.id,
      acao: "adicionar_indicacao_retroativa",
      detalhes: `${aplicacaoId} | código ${codigoIndicador.trim().toUpperCase()}`,
    },
  });

  revalidatePath("/restrito/aportes");
  revalidatePath("/restrito/painel");
  return { sucesso: "Bônus de indicação creditado." };
}

/** Libera manualmente o bônus de indicação de um aporte específico (que não seja o primeiro do
 *  indicado, ou que o modo automático não tenha pego) — usa o vínculo de indicação já fixado no
 *  cadastro (`indicadoPorId`), sem precisar de código. Disponível em qualquer modo, pra sempre
 *  dar um jeito de corrigir manualmente. Idempotente por aplicacaoId. */
export async function liberarBonusIndicacaoManual(
  aplicacaoId: string
): Promise<{ error?: string; sucesso?: string }> {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") return { error: "Acesso negado." };

  const aplicacao = await prisma.aplicacao.findUnique({ where: { id: aplicacaoId } });
  if (!aplicacao) return { error: "Aporte não encontrado." };
  if (aplicacao.status !== "CONFIRMADA") {
    return { error: "Só é possível liberar bônus em aportes já confirmados." };
  }

  const resultado = await prisma.$transaction((tx) =>
    creditarBonusIndicacaoPorAporte(tx, {
      aplicacaoId: aplicacao.id,
      aportanteUserId: aplicacao.userId,
      valorAporte: aplicacao.valor,
    })
  );
  if (resultado.error) return { error: resultado.error };
  if (resultado.pulou) {
    return { error: "Esse investidor não tem nenhum indicador vinculado — nada pra liberar." };
  }

  await prisma.logAuditoria.create({
    data: { userId: session.user.id, acao: "liberar_bonus_indicacao_manual", detalhes: aplicacaoId },
  });

  revalidatePath("/restrito/aportes");
  revalidatePath("/restrito/indicacoes");
  revalidatePath("/restrito/painel");
  return { sucesso: "Bônus de indicação liberado." };
}
