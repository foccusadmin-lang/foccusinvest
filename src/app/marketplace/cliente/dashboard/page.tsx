import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/button";
import { MARKETPLACE_REGIAO_LABEL } from "@/lib/marketplace/config";

export default async function ClienteDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/marketplace/cliente/dashboard");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");
  if (user.papelMarketplace !== "CLIENTE") redirect("/marketplace");

  const primeiroNome = user.name?.split(" ")[0] ?? "cliente";

  const [categorias, totalPedidos, pedidosAbertos] = await Promise.all([
    prisma.categoriaServico.findMany({
      where: { ativa: true },
      orderBy: { nome: "asc" },
      include: { servicos: { where: { ativo: true }, select: { id: true } } },
    }),
    prisma.solicitacaoServico.count({ where: { clienteId: user.id } }),
    prisma.solicitacaoServico.count({
      where: { clienteId: user.id, status: { in: ["PENDENTE", "ACEITA", "EM_ANDAMENTO"] } },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Olá, {primeiroNome} 👋</h1>
        <p className="mt-1 text-sm text-muted">📍 {MARKETPLACE_REGIAO_LABEL}</p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="text-sm font-medium text-foreground">O que você precisa?</p>
        <p className="mt-1 text-sm text-muted">
          Escolha um serviço e um bairro pra ver quem atende sua região.
        </p>
        <LinkButton href="/marketplace/cliente/buscar" variant="gold" className="mt-4 w-full">
          🔎 Buscar serviço
        </LinkButton>
        <p className="mt-3 text-xs text-muted">
          Mapa e filtro por distância chegam numa próxima etapa — por enquanto, a busca é por
          bairro.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Categorias</h2>
        {categorias.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Nenhuma categoria cadastrada ainda. O admin pode cadastrar em breve pelo painel.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {categorias.map((categoria) => (
              <div
                key={categoria.id}
                className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface p-4 text-center"
              >
                <span className="text-2xl">{categoria.icone || "🧰"}</span>
                <span className="text-sm font-medium text-foreground">{categoria.nome}</span>
                <span className="text-xs text-muted">{categoria.servicos.length} serviços</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Prestadores perto de você
        </h2>
        <div className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Escolha um serviço e um bairro em{" "}
          <Link href="/marketplace/cliente/buscar" className="text-sky-300 hover:underline">
            Buscar serviço
          </Link>{" "}
          pra ver quem atende sua região. Mapa, distância e localização automática chegam numa
          próxima etapa.
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Meus pedidos</h2>
        <div className="mt-3 flex gap-4">
          <div className="rounded-xl border border-border bg-surface px-5 py-4">
            <p className="text-2xl font-bold text-foreground">{totalPedidos}</p>
            <p className="text-xs text-muted">Total de solicitações</p>
          </div>
          <div className="rounded-xl border border-border bg-surface px-5 py-4">
            <p className="text-2xl font-bold text-foreground">{pedidosAbertos}</p>
            <p className="text-xs text-muted">Em andamento</p>
          </div>
        </div>
      </div>
    </div>
  );
}
