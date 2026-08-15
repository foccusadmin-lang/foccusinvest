"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getResumoCarteira } from "@/lib/carteira";
import { perguntarGemini, GeminiIndisponivelError, type MensagemGuia } from "@/lib/gemini";
import { CONHECIMENTO_PLATAFORMA, montarContextoUsuario } from "@/lib/guia-conhecimento";

const MAX_MENSAGENS_HISTORICO = 12;
const MAX_CARACTERES_MENSAGEM = 1000;

export type RespostaGuia = { resposta?: string; error?: string };

/** Deduz um nível de experiência simples a partir do uso real da conta — usado só pra calibrar
 *  o tom das respostas do assistente (mais didático pra quem tá começando). */
function deduzirNivelExperiencia(
  aportesAnteriores: number,
  saquesAnteriores: number
): "novato" | "iniciante" | "experiente" {
  if (aportesAnteriores === 0) return "novato";
  if (aportesAnteriores <= 2 && saquesAnteriores === 0) return "iniciante";
  return "experiente";
}

export async function enviarMensagemGuia(historico: MensagemGuia[]): Promise<RespostaGuia> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autenticado." };
  const userId = session.user.id;

  if (historico.length === 0) return { error: "Envie uma mensagem." };
  const ultima = historico[historico.length - 1];
  if (ultima.role !== "user" || !ultima.texto.trim()) {
    return { error: "Mensagem inválida." };
  }
  if (ultima.texto.length > MAX_CARACTERES_MENSAGEM) {
    return { error: `Mensagem muito longa (máximo ${MAX_CARACTERES_MENSAGEM} caracteres).` };
  }

  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    include: { pessoaFisica: true, pessoaJuridica: true },
  });
  if (!usuario) return { error: "Usuário não encontrado." };

  const nome =
    usuario.pessoaFisica?.nomeCompleto ??
    usuario.pessoaJuridica?.razaoSocial ??
    usuario.name ??
    "investidor(a)";
  const ehLider = usuario.perfil === "LIDER";

  const [resumo, aportesAnteriores, saquesAnteriores] = await Promise.all([
    getResumoCarteira(userId),
    prisma.aplicacao.count({
      where: {
        userId,
        origem: "NOVA_APLICACAO",
        status: { in: ["CONFIRMADA", "SAQUE_SOLICITADO", "RETIRADA"] },
      },
    }),
    prisma.solicitacaoSaque.count({ where: { userId } }),
  ]);

  const contexto = montarContextoUsuario({
    nome: nome.split(" ")[0],
    statusCadastro: usuario.statusCadastro,
    ehLider,
    capitalPrincipal: resumo.capitalPrincipal,
    capitalDisponivel: resumo.capitalDisponivel,
    capitalCarencia: resumo.capitalCarencia,
    rendimentoDisponivel: resumo.distribuicoesDisponiveis,
    bonusDisponivel: resumo.bonusIndicacao,
    incentivoLiderancaDisponivel: resumo.incentivoLiderancaDisponivel,
    aportesAnteriores,
    saquesAnteriores,
    nivelExperiencia: deduzirNivelExperiencia(aportesAnteriores, saquesAnteriores),
  });

  const historicoLimitado = historico.slice(-MAX_MENSAGENS_HISTORICO);

  try {
    const resposta = await perguntarGemini(
      `${CONHECIMENTO_PLATAFORMA}\n\n${contexto}`,
      historicoLimitado
    );
    return { resposta };
  } catch (e) {
    if (e instanceof GeminiIndisponivelError) return { error: e.message };
    console.error("Falha inesperada ao consultar o Guia Foccus:", e);
    return { error: "Assistente indisponível no momento. Tente novamente em instantes." };
  }
}

export async function marcarTourConcluido(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  await prisma.user.update({ where: { id: session.user.id }, data: { tourConcluido: true } });
  revalidatePath("/painel");
}
