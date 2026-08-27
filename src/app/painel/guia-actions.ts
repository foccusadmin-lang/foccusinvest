"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getResumoCarteira } from "@/lib/carteira";
import { perguntarGemini, GeminiIndisponivelError, type MensagemGuia } from "@/lib/gemini";
import {
  CONHECIMENTO_PLATAFORMA,
  montarContextoUsuario,
  classificarTopico,
  montarBlocoFaq,
  montarAvisoTopicoRecorrente,
  pedeAtendimentoHumano,
  respostaAtendimentoHumano,
} from "@/lib/guia-conhecimento";

const MAX_MENSAGENS_HISTORICO = 12;
const MAX_CARACTERES_MENSAGEM = 1000;
const MAX_HISTORICO_PERSISTIDO = 30;

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
  const primeiroNome = nome.split(" ")[0];
  const ehLider = usuario.perfil === "LIDER";

  const topicoPergunta = classificarTopico(ultima.texto);

  // Pedido explícito de falar com humano é resolvido direto aqui, sem gastar chamada de API —
  // garante 100% de consistência nesse caso específico.
  if (pedeAtendimentoHumano(ultima.texto)) {
    const resposta = respostaAtendimentoHumano(primeiroNome);
    await prisma.mensagemGuia.createMany({
      data: [
        { userId, papel: "USER", texto: ultima.texto, topico: topicoPergunta },
        { userId, papel: "MODEL", texto: resposta, topico: "Atendimento humano" },
      ],
    });
    return { resposta };
  }

  const [resumo, aportesAnteriores, saquesAnteriores, vezesTopicoAnterior, faqs] = await Promise.all([
    getResumoCarteira(userId),
    prisma.aplicacao.count({
      where: {
        userId,
        origem: "NOVA_APLICACAO",
        status: { in: ["CONFIRMADA", "SAQUE_SOLICITADO", "RETIRADA"] },
      },
    }),
    prisma.solicitacaoSaque.count({ where: { userId } }),
    prisma.mensagemGuia.count({ where: { userId, papel: "USER", topico: topicoPergunta } }),
    prisma.faqGuia.findMany({ orderBy: { topico: "asc" } }),
  ]);

  const contexto = montarContextoUsuario({
    nome: primeiroNome,
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

  const blocoFaq = montarBlocoFaq(faqs);
  const avisoRecorrente = montarAvisoTopicoRecorrente(topicoPergunta, vezesTopicoAnterior + 1);

  const historicoLimitado = historico.slice(-MAX_MENSAGENS_HISTORICO);

  try {
    const resposta = await perguntarGemini(
      `${CONHECIMENTO_PLATAFORMA}\n\n${contexto}${blocoFaq}${avisoRecorrente}`,
      historicoLimitado
    );

    await prisma.mensagemGuia.createMany({
      data: [
        { userId, papel: "USER", texto: ultima.texto, topico: topicoPergunta },
        { userId, papel: "MODEL", texto: resposta, topico: null },
      ],
    });

    return { resposta };
  } catch (e) {
    if (e instanceof GeminiIndisponivelError) return { error: e.message };
    console.error("Falha inesperada ao consultar o Guia Foccus:", e);
    return { error: "Assistente indisponível no momento. Tente novamente em instantes." };
  }
}

/** Carrega as últimas mensagens do Guia Foccus pra dar continuidade ao chat entre sessões —
 *  chamado quando o widget abre, antes de decidir se mostra a mensagem de boas-vindas. */
export async function carregarHistoricoGuia(): Promise<MensagemGuia[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const mensagens = await prisma.mensagemGuia.findMany({
    where: { userId: session.user.id },
    orderBy: { criadoEm: "desc" },
    take: MAX_HISTORICO_PERSISTIDO,
  });

  return mensagens
    .reverse()
    .map((m) => ({ role: m.papel === "USER" ? ("user" as const) : ("model" as const), texto: m.texto }));
}

export async function marcarTourConcluido(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  await prisma.user.update({ where: { id: session.user.id }, data: { tourConcluido: true } });
  revalidatePath("/painel");
}

/** Marca que o investidor já viu o modal de convite pro Grupo Foccus — chamado tanto ao clicar
 *  em "Acessar grupo" quanto ao fechar a janela (ver GrupoFoccusModal). Uma vez marcado, o modal
 *  nunca mais aparece pra essa conta, em nenhum dispositivo. */
export async function marcarGrupoFoccusVisto(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  await prisma.user.update({ where: { id: session.user.id }, data: { viuGrupoFoccus: true } });
  revalidatePath("/painel");
}
