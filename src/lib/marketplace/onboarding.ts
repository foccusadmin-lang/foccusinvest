import type { PapelMarketplace } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MARKETPLACE_CITY, MARKETPLACE_STATE } from "./config";

/**
 * Define o papel do usuário no marketplace (CLIENTE/PRESTADOR) e, no caso de prestador, cria o
 * perfil profissional já com cidade/estado da região atendida (spec: nunca deixar prestador
 * fora da área permitida — aqui ele já nasce dentro dela; mudar de cidade não é possível hoje).
 * Idempotente: escolher o mesmo papel de novo, ou um prestador que já tem perfil, não duplica nada.
 */
export async function aplicarPapelMarketplace(userId: string, papel: PapelMarketplace) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { papelMarketplace: papel },
  });

  if (papel === "PRESTADOR") {
    await prisma.perfilPrestador.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        nomeProfissional: user.name?.trim() || "Prestador",
        cidade: MARKETPLACE_CITY,
        estado: MARKETPLACE_STATE,
      },
    });
  }

  return user;
}

export function rotaDashboardMarketplace(papel: PapelMarketplace | null | undefined): string {
  if (papel === "PRESTADOR") return "/marketplace/prestador/dashboard";
  if (papel === "CLIENTE") return "/marketplace/cliente/dashboard";
  return "/marketplace";
}
