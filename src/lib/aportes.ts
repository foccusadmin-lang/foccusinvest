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

/** Ajuste feito pelo admin ao confirmar um aporte em bem (imóvel/automóvel/eletrônico) — o valor
 *  declarado pelo investidor e a carência padrão da categoria só viram definitivos aqui, depois
 *  do admin avaliar o bem entregue em mãos. Nunca usado na confirmação automática de aporte via
 *  Pix — bem sempre exige avaliação manual do admin, em qualquer modo. */
export type AjusteBem = { valor: number; mesesCarencia: number };

/**
 * Confirma um aporte (status AGUARDANDO_APROVACAO → CONFIRMADA), credita bônus de indicação
 * quando aplicável, gera/envia contrato de aporte em bem (se for o caso) e notifica o
 * investidor. Compartilhada entre:
 * - aprovarAporte (restrito/aportes/actions.ts) — admin clica em "Aprovar", aprovadoPorId = o
 *   próprio admin.
 * - criarAplicacao (painel/actions.ts) — quando o modo de Aprovação de Aportes está AUTOMATICO,
 *   confirma na hora que o investidor envia o comprovante Pix, aprovadoPorId = null (aprovado
 *   pelo sistema, não por uma pessoa).
 */
export async function confirmarAporte(
  aplicacaoId: string,
  aprovadoPorId: string | null,
  ajusteBem?: AjusteBem
): Promise<void> {
  const aplicacao = await prisma.aplicacao.findUnique({ where: { id: aplicacaoId } });
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
      where: { id: aplicacaoId },
      data: {
        status: "CONFIRMADA",
        valor: valorFinal,
        liberaEm: liberaEmFinal,
        aprovadoPorId,
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
      userId: aprovadoPorId,
      acao: aprovadoPorId ? "aprovar_aporte" : "aprovar_aporte_automatico",
      detalhes: ajusteBem
        ? `${aplicacaoId} | bem avaliado: valor=${valorFinal}, carência=${ajusteBem.mesesCarencia} meses`
        : aplicacaoId,
    },
  });

  if (dadosContrato) {
    await enviarEmailContrato({ ...dadosContrato, valor: valorFinal, data: new Date() });
  }

  // Fora da transação de propósito: e-mail/WhatsApp são best-effort (nunca lançam erro) e não
  // devem fazer a confirmação do aporte esperar nem, muito menos, reverter se falharem.
  await notificarAporteConfirmado(aplicacao.userId, valorFinal);

  // revalidatePath fica por conta de quem chama (server action) — só funciona dentro do
  // contexto de uma requisição real, o que quebraria testar esta função isoladamente.
}
