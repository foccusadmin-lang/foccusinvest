"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda } from "@/lib/format";
import { debitarSaldoDisponivelParaDoacao, creditarDoacaoNaEntidade } from "@/lib/entidades";
import { SaldoInsuficienteError } from "@/lib/carteira";

export type DoacaoState = { error?: string; sucesso?: string } | undefined;

const VALOR_MINIMO_DOACAO = 10;
const TAMANHO_MAXIMO_COMPROVANTE = 5 * 1024 * 1024;

function parseValor(raw: FormDataEntryValue | null): number {
  const texto = String(raw ?? "").trim().replace(/\./g, "").replace(",", ".");
  return Number(texto);
}

async function nomeDaEntidade(entidadeId: string): Promise<string> {
  const entidade = await prisma.entidade.findUnique({
    where: { id: entidadeId },
    include: { user: { include: { pessoaJuridica: true } } },
  });
  return entidade?.user.pessoaJuridica?.nomeFantasia ?? entidade?.user.pessoaJuridica?.razaoSocial ?? "a entidade";
}

/** Modalidade 1: doa a partir do saldo disponível (rendimento + bônus ainda não usados — a
 *  mesma base que já vale pra Reaplicar). Débito e crédito acontecem juntos, numa transação só,
 *  sempre validado no servidor. */
export async function doarComSaldo(_prevState: DoacaoState, formData: FormData): Promise<DoacaoState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autenticado." };

  const entidadeId = String(formData.get("entidadeId") ?? "");
  const valor = parseValor(formData.get("valor"));
  const anonima = formData.get("anonima") === "true";

  if (!entidadeId) return { error: "Selecione uma entidade." };
  if (!valor || valor <= 0 || Number.isNaN(valor)) return { error: "Informe um valor válido." };
  if (valor < VALOR_MINIMO_DOACAO) {
    return { error: `O valor mínimo de doação é ${formatMoeda(VALOR_MINIMO_DOACAO)}.` };
  }

  const entidade = await prisma.entidade.findUnique({ where: { id: entidadeId } });
  if (!entidade || entidade.status !== "ATIVA" || !entidade.podeReceberDoacao) {
    return { error: "Essa entidade não está disponível pra receber doações no momento." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await debitarSaldoDisponivelParaDoacao(tx, session.user.id, valor);
      const aplicacaoId = await creditarDoacaoNaEntidade(tx, entidade.userId, valor);
      await tx.doacao.create({
        data: {
          doadorId: session.user.id,
          entidadeId: entidade.id,
          tipoDoacao: "SALDO_DISPONIVEL",
          valorBruto: valor,
          valorLiquido: valor,
          origemSaldo: "Saldo disponível (rendimento/bônus)",
          doacaoAnonima: anonima,
          status: "CONFIRMADA",
          aplicacaoId,
          confirmadoEm: new Date(),
        },
      });
    });
  } catch (e) {
    if (e instanceof SaldoInsuficienteError) return { error: e.message };
    throw e;
  }

  revalidatePath("/painel/doar");
  revalidatePath("/painel");
  revalidatePath("/painel/historico");

  const nome = await nomeDaEntidade(entidadeId);
  return {
    sucesso: `Sua doação foi realizada com sucesso. ${formatMoeda(valor)} foram creditados diretamente na conta de ${nome}.`,
  };
}

/** Modalidade 2: nova aplicação em nome da entidade — segue o mesmo fluxo de Pix + comprovante
 *  + aprovação do admin de uma aplicação normal, mas o valor nunca passa pela carteira do
 *  doador: só é creditado na entidade quando o admin aprovar. */
export async function criarDoacaoNovaAplicacao(
  _prevState: DoacaoState,
  formData: FormData
): Promise<DoacaoState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autenticado." };

  const entidadeId = String(formData.get("entidadeId") ?? "");
  const valor = parseValor(formData.get("valor"));
  const anonima = formData.get("anonima") === "true";
  const comprovante = formData.get("comprovante");

  if (!entidadeId) return { error: "Selecione uma entidade." };
  if (!valor || valor <= 0 || Number.isNaN(valor)) return { error: "Informe um valor válido." };
  if (valor < VALOR_MINIMO_DOACAO) {
    return { error: `O valor mínimo é ${formatMoeda(VALOR_MINIMO_DOACAO)}.` };
  }
  if (!(comprovante instanceof File) || comprovante.size === 0) {
    return { error: "Envie o comprovante do pagamento." };
  }
  if (comprovante.size > TAMANHO_MAXIMO_COMPROVANTE) {
    return { error: "Arquivo muito grande. Envie um comprovante de até 5MB." };
  }

  const entidade = await prisma.entidade.findUnique({ where: { id: entidadeId } });
  if (!entidade || entidade.status !== "ATIVA" || !entidade.podeReceberAplicacao) {
    return { error: "Essa entidade não está disponível pra receber novas aplicações no momento." };
  }

  const bytes = Buffer.from(await comprovante.arrayBuffer());

  await prisma.doacao.create({
    data: {
      doadorId: session.user.id,
      entidadeId: entidade.id,
      tipoDoacao: "NOVA_APLICACAO",
      valorBruto: valor,
      valorLiquido: valor,
      doacaoAnonima: anonima,
      status: "EM_ANALISE",
      comprovante: bytes,
      comprovanteNome: comprovante.name,
      comprovanteTipo: comprovante.type || "application/octet-stream",
    },
  });

  revalidatePath("/painel/doar");

  return {
    sucesso:
      "Comprovante enviado! Assim que o admin confirmar o pagamento, o valor entra direto na conta da entidade.",
  };
}
