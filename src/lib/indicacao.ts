import type { Prisma } from "@prisma/client";

export const PERCENTUAL_BONUS_INDICACAO = 5;

/** Credita 5% de bônus pro indicador quando o indicado tem seu PRIMEIRO aporte (Nova Aplicação)
 *  aprovado — nunca em reaplicações, migrações ou aportes seguintes do mesmo CPF. Deve ser
 *  chamada logo depois de marcar a aplicação como CONFIRMADA, dentro da mesma transação. */
export async function creditarBonusIndicacaoSeElegivel(
  tx: Prisma.TransactionClient,
  userId: string,
  valorAporte: number
): Promise<void> {
  const usuario = await tx.user.findUnique({ where: { id: userId } });
  if (!usuario?.indicadoPorId) return;

  const aportesConfirmados = await tx.aplicacao.count({
    where: {
      userId,
      origem: "NOVA_APLICACAO",
      status: { in: ["CONFIRMADA", "SAQUE_SOLICITADO", "RETIRADA"] },
    },
  });
  if (aportesConfirmados !== 1) return; // não é o primeiro aporte confirmado desse CPF

  const valorBonus = valorAporte * (PERCENTUAL_BONUS_INDICACAO / 100);

  await tx.creditoCarteira.create({
    data: {
      userId: usuario.indicadoPorId,
      tipo: "BONUS",
      valor: valorBonus,
      moeda: "BRL",
      origem: `Indicação: ${PERCENTUAL_BONUS_INDICACAO}% do primeiro aporte de ${usuario.name ?? usuario.email}`,
    },
  });
}
