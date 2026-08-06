import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda } from "@/lib/format";
import { AportesLista } from "./aportes-lista";

export default async function RestritoAportesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const [pendentes, recentes] = await Promise.all([
    prisma.aplicacao.findMany({
      where: { status: "AGUARDANDO_APROVACAO" },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { criadoEm: "asc" },
    }),
    prisma.aplicacao.findMany({
      where: { status: { in: ["CONFIRMADA", "REJEITADA"] }, origem: "NOVA_APLICACAO" },
      include: {
        user: { select: { name: true, email: true } },
        aprovadoPor: { select: { name: true, email: true } },
      },
      orderBy: { aprovadoEm: "desc" },
      take: 20,
    }),
  ]);

  const totalPendente = pendentes.reduce((acc, a) => acc + a.valor, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Aportes via Pix</h1>
      <p className="mt-1 text-sm text-muted">
        Confira o comprovante enviado antes de aprovar — o valor só entra na carteira do
        investidor depois da sua confirmação.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          Aguardando aprovação
        </p>
        <p className="mt-1 text-2xl font-bold text-amber-300">{pendentes.length}</p>
        <p className="text-xs text-muted">{formatMoeda(totalPendente)}</p>
      </div>

      <AportesLista pendentes={pendentes} recentes={recentes} />
    </div>
  );
}
