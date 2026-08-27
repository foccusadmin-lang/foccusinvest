import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listarRegioesAtivas } from "@/lib/marketplace/regioes";
import { BuscaPrestadores } from "@/components/marketplace/busca-prestadores";
import { SugestaoEnviadaBanner } from "@/components/marketplace/sugerir-bairro";

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ sugestaoEnviada?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/marketplace/cliente/buscar");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");
  if (user.papelMarketplace !== "CLIENTE") redirect("/marketplace");

  const { sugestaoEnviada } = await searchParams;

  const [servicos, regioes] = await Promise.all([
    prisma.servico.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    listarRegioesAtivas(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      {sugestaoEnviada && <SugestaoEnviadaBanner />}

      <div>
        <h1 className="text-2xl font-bold text-foreground">O que você precisa?</h1>
        <p className="mt-1 text-sm text-muted">
          Digite um serviço e um bairro — os prestadores aparecem na sequência, automaticamente.
        </p>
      </div>

      <BuscaPrestadores servicos={servicos} regioes={regioes.map((r) => ({ id: r.id, nome: r.nome }))} />
    </div>
  );
}
