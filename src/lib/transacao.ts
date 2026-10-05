import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/** Padrão do Prisma é 2s pra conseguir conexão e 5s pra transação inteira — apertado demais com
 *  o pool pequeno daqui (max 3 por instância, ver lib/prisma.ts) quando várias requisições
 *  concorrentes disputam conexão. Nessas horas a transação falhava com P2028 e o investidor via a
 *  tela de erro genérica, mesmo com a operação correta. */
export const OPCOES_TRANSACAO = { maxWait: 10_000, timeout: 20_000 };

// P2028: transação expirou/não conseguiu iniciar · P2034: conflito/deadlock · P2024: pool esgotado.
// Em todos, a transação foi desfeita por inteiro — tentar de novo é seguro.
const CODIGOS_TRANSITORIOS = new Set(["P2028", "P2034", "P2024"]);

export function ehErroTransitorioDeBanco(e: unknown): boolean {
  const code = typeof e === "object" && e !== null ? (e as { code?: string }).code : undefined;
  return !!code && CODIGOS_TRANSITORIOS.has(code);
}

export async function transacaoComRetentativa<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  tentativas = 3
): Promise<T> {
  for (let tentativa = 1; ; tentativa++) {
    try {
      return await prisma.$transaction(fn, OPCOES_TRANSACAO);
    } catch (e) {
      if (tentativa >= tentativas || !ehErroTransitorioDeBanco(e)) throw e;
      console.error(`Transação falhou (tentativa ${tentativa}/${tentativas}), tentando de novo:`, e);
      await new Promise((r) => setTimeout(r, 250 * tentativa));
    }
  }
}
