"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MARKETPLACE_CITY } from "@/lib/marketplace/config";

/**
 * Salva onde o prestador mora (regiaoPrincipal) e onde ele atende (regioesAtendidas). Resincroniza
 * a lista de atendimento inteira a cada envio — mais simples e sem risco de sobra do que tentar
 * calcular só o diff no cliente.
 */
export async function salvarRegioesPrestador(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/marketplace/prestador/regiao");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { perfilPrestador: true },
  });
  if (!user?.perfilPrestador || user.papelMarketplace !== "PRESTADOR") {
    redirect("/marketplace");
  }
  const prestadorId = user.perfilPrestador.id;

  const regiaoPrincipalIdEnviada = String(formData.get("regiaoPrincipalId") || "") || null;
  const regiaoIdsEnviadas = formData.getAll("regiaoIds").map(String);

  // Nunca confia direto no que veio do form: só aceita regiões ativas da cidade atendida
  // (nunca deixar o prestador "atender" um bairro de outra cidade — spec seção 5/32).
  const idsPedidos = [
    ...(regiaoPrincipalIdEnviada ? [regiaoPrincipalIdEnviada] : []),
    ...regiaoIdsEnviadas,
  ];
  const validas = await prisma.regiao.findMany({
    where: { id: { in: idsPedidos }, ativo: true, cidade: MARKETPLACE_CITY },
    select: { id: true },
  });
  const idsValidos = new Set(validas.map((r) => r.id));

  const regiaoPrincipalId =
    regiaoPrincipalIdEnviada && idsValidos.has(regiaoPrincipalIdEnviada)
      ? regiaoPrincipalIdEnviada
      : null;
  const regiaoIds = regiaoIdsEnviadas.filter((id) => idsValidos.has(id));

  await prisma.perfilPrestador.update({
    where: { id: prestadorId },
    data: { regiaoPrincipalId },
  });

  await prisma.$transaction([
    prisma.prestadorRegiao.deleteMany({
      where: { prestadorId, regiaoId: { notIn: regiaoIds } },
    }),
    ...regiaoIds.map((regiaoId) =>
      prisma.prestadorRegiao.upsert({
        where: { prestadorId_regiaoId: { prestadorId, regiaoId } },
        update: {},
        create: { prestadorId, regiaoId },
      })
    ),
  ]);

  redirect("/marketplace/prestador/dashboard");
}
