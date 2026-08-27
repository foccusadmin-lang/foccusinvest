import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MarketplaceNav } from "@/components/marketplace/marketplace-nav";

/** Layout compartilhado por toda a área /marketplace (Foccus Serviços) — landing pública,
 *  dashboards de cliente/prestador e admin. Só cuida do cabeçalho comum; cada rota abaixo segue
 *  responsável pela própria checagem de sessão/papel, igual ao padrão de /painel e /restrito. */
export default async function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  let papel: "CLIENTE" | "PRESTADOR" | null = null;
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { papelMarketplace: true },
    });
    papel = user?.papelMarketplace ?? null;
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <MarketplaceNav logado={Boolean(session?.user)} papel={papel} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
