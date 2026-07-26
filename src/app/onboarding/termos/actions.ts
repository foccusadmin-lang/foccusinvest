"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const TERMOS_VERSAO = "0.1";

export async function aceitarTermos() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    null;

  const tipos = ["termos_uso", "politica_privacidade", "ciencia_riscos"];

  await prisma.$transaction(
    tipos.map((tipo) =>
      prisma.termoAceite.create({
        data: {
          userId: session.user.id,
          tipo,
          versao: TERMOS_VERSAO,
          ip,
        },
      })
    )
  );

  redirect("/onboarding/cadastro");
}
