import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="flex-1 rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-muted">
            🔎 Digite um serviço (em breve)
          </div>
          <div className="flex-1 rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-muted">
            📍 Onde? — {MARKETPLACE_REGIAO_LABEL}
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          A busca por serviço e bairro chega numa próxima etapa, junto com o mapa e o filtro por
          distância.
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
          A busca de prestadores por região chega na próxima fase — mapa, distância e filtros.
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
