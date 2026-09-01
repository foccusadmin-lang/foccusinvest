import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { obterCatalogoComStatus, contarIndicadosDiretosAtivos } from "@/lib/servicos-contratacao";
import { META_INDICADOS_LIDERANCA } from "@/lib/servicos";
import { ServicosClient } from "./servicos-client";

export default async function PainelServicosPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { pessoaFisica: true, pessoaJuridica: true },
  });
  if (!user) redirect("/login");

  const primeiroNome =
    user.pessoaFisica?.nomeCompleto.split(" ")[0] ??
    user.pessoaJuridica?.nomeFantasia?.split(" ")[0] ??
    user.name?.split(" ")[0] ??
    "investidor(a)";

  const [catalogo, diretosAtivos] = await Promise.all([
    obterCatalogoComStatus(user.id),
    contarIndicadosDiretosAtivos(user.id),
  ]);

  return (
    <ServicosClient
      catalogo={catalogo}
      primeiroNome={primeiroNome}
      diretosAtivos={diretosAtivos}
      metaLideranca={META_INDICADOS_LIDERANCA}
    />
  );
}
