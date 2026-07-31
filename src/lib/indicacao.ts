import type { Prisma } from "@prisma/client";

export const PERCENTUAL_BONUS_INDICACAO = 5;

/** Marca colocada no início de `motivoRejeicao` pra guardar temporariamente o código de
 *  indicação digitado na Nova Aplicação, até o admin aprovar o aporte (só então o bônus é
 *  creditado). Nunca aparece pro investidor: só é lido/limpo em `aprovarAporte`, e a tela só
 *  mostra `motivoRejeicao` quando o status é REJEITADA. */
const MARCA_INDICADOR = "__INDICADOR__:";

export function guardarCodigoIndicadorPendente(codigoIndicador: string): string {
  return `${MARCA_INDICADOR}${codigoIndicador}`;
}

export function extrairCodigoIndicadorPendente(motivoRejeicao: string | null): string | null {
  if (!motivoRejeicao?.startsWith(MARCA_INDICADOR)) return null;
  return motivoRejeicao.slice(MARCA_INDICADOR.length);
}

function origemBonus(aplicacaoId: string, nomeIndicado: string): string {
  return `Indicação: ${PERCENTUAL_BONUS_INDICACAO}% do aporte de ${nomeIndicado} (${aplicacaoId})`;
}

export type ResultadoIndicacao = { error?: string };

/** Credita 5% de bônus pro dono do código de indicação sobre o valor de UM aporte específico.
 *  Chamado tanto na aprovação normal (código digitado na hora) quanto no lançamento retroativo
 *  (admin adiciona depois que o investidor esqueceu). Idempotente por aplicacaoId — não credita
 *  duas vezes o mesmo aporte. */
export async function creditarBonusIndicacaoPorCodigo(
  tx: Prisma.TransactionClient,
  params: { codigoIndicador: string; aplicacaoId: string; aportanteUserId: string; valorAporte: number }
): Promise<ResultadoIndicacao> {
  const { codigoIndicador, aplicacaoId, aportanteUserId, valorAporte } = params;

  const codigo = codigoIndicador.trim().toUpperCase();
  if (!codigo) return { error: "Informe um código de indicação." };

  const indicador = await tx.user.findUnique({ where: { codigoIndicacao: codigo } });
  if (!indicador) return { error: "Código de indicação não encontrado." };
  if (indicador.id === aportanteUserId) {
    return { error: "Você não pode usar o seu próprio código de indicação." };
  }

  const jaCreditado = await tx.creditoCarteira.findFirst({
    where: { tipo: "BONUS", origem: { endsWith: `(${aplicacaoId})` } },
  });
  if (jaCreditado) return { error: "Esse aporte já tem um bônus de indicação creditado." };

  const aportante = await tx.user.findUnique({ where: { id: aportanteUserId } });
  const valorBonus = valorAporte * (PERCENTUAL_BONUS_INDICACAO / 100);

  await tx.creditoCarteira.create({
    data: {
      userId: indicador.id,
      tipo: "BONUS",
      valor: valorBonus,
      moeda: "BRL",
      origem: origemBonus(aplicacaoId, aportante?.name ?? aportante?.email ?? "investidor"),
    },
  });

  return {};
}
