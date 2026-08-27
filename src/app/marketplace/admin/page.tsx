import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/button";
import { IconShield } from "@/components/icons";
import { MARKETPLACE_REGIAO_LABEL } from "@/lib/marketplace/config";

export default async function MarketplaceAdminPage() {
  const session = await auth();
  const isAdmin = session?.user?.perfil === "ADMIN";

  if (!isAdmin) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
          <IconShield width={22} height={22} />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-foreground">
          Área exclusiva para administradores autorizados
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted">
          Entre com uma conta de administrador pra acessar o painel do marketplace.
        </p>
        <div className="mt-6">
          <LinkButton
            href={`/login?callbackUrl=${encodeURIComponent("/marketplace/admin")}`}
            variant="outline"
          >
            Entrar como administrador
          </LinkButton>
        </div>
      </div>
    );
  }

  const [
    totalClientes,
    totalPrestadores,
    prestadoresAtivos,
    prestadoresVerificados,
    totalCategorias,
    totalServicos,
    totalSolicitacoes,
    solicitacoesPendentes,
    avaliacoes,
  ] = await Promise.all([
    prisma.user.count({ where: { papelMarketplace: "CLIENTE" } }),
    prisma.user.count({ where: { papelMarketplace: "PRESTADOR" } }),
    prisma.perfilPrestador.count({ where: { ativo: true } }),
    prisma.perfilPrestador.count({ where: { verificado: true } }),
    prisma.categoriaServico.count(),
    prisma.servico.count(),
    prisma.solicitacaoServico.count(),
    prisma.solicitacaoServico.count({ where: { status: "PENDENTE" } }),
    prisma.avaliacaoServico.aggregate({ _avg: { nota: true }, _count: true }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Marketplace — Admin</h1>
        <p className="mt-1 text-sm text-muted">📍 Região atendida: {MARKETPLACE_REGIAO_LABEL}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card titulo="Clientes" valor={totalClientes} />
        <Card
          titulo="Prestadores"
          valor={totalPrestadores}
          detalhe={`${prestadoresAtivos} ativos · ${prestadoresVerificados} verificados`}
        />
        <Card titulo="Categorias" valor={totalCategorias} />
        <Card titulo="Serviços" valor={totalServicos} />
        <Card
          titulo="Solicitações"
          valor={totalSolicitacoes}
          detalhe={`${solicitacoesPendentes} pendentes`}
        />
        <Card
          titulo="Avaliações"
          valor={avaliacoes._count}
          detalhe={avaliacoes._avg.nota ? `média ⭐ ${avaliacoes._avg.nota.toFixed(1)}` : undefined}
        />
      </div>

      <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted">
        Cadastro de categorias/profissões, aprovação de prestadores e gestão de solicitações
        pelo painel chegam na próxima etapa. Por enquanto, os dados acima refletem o que já está
        no banco (inclusive os dados demo).
      </div>
    </div>
  );
}

function Card({ titulo, valor, detalhe }: { titulo: string; valor: number; detalhe?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-4">
      <p className="text-xl font-bold text-foreground">{valor}</p>
      <p className="text-xs text-muted">{titulo}</p>
      {detalhe && <p className="mt-1 text-[11px] text-muted/70">{detalhe}</p>}
    </div>
  );
}
