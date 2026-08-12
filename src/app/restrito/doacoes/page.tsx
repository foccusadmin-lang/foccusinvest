import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda } from "@/lib/format";
import { DoacoesLista } from "./doacoes-lista";

export default async function RestritoDoacoesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const [pendentes, recentes] = await Promise.all([
    prisma.doacao.findMany({
      where: { status: "EM_ANALISE" },
      include: {
        doador: { select: { name: true, email: true } },
        entidade: { include: { user: { include: { pessoaJuridica: true } } } },
      },
      orderBy: { criadoEm: "asc" },
      omit: { comprovante: true },
    }),
    prisma.doacao.findMany({
      where: { status: { in: ["CONFIRMADA", "CANCELADA", "ESTORNADA"] } },
      include: {
        doador: { select: { name: true, email: true } },
        entidade: { include: { user: { include: { pessoaJuridica: true } } } },
      },
      orderBy: { criadoEm: "desc" },
      take: 30,
      omit: { comprovante: true },
    }),
  ]);

  const totalPendente = pendentes.reduce((acc, d) => acc + d.valorBruto, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Doações para entidades</h1>
      <p className="mt-1 text-sm text-muted">
        Doações do tipo "Nova aplicação" ficam em análise até você conferir o comprovante — só
        depois o valor entra na conta da entidade. Doações com saldo disponível já são
        confirmadas na hora.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Aguardando aprovação</p>
        <p className="mt-1 text-2xl font-bold text-amber-300">{pendentes.length}</p>
        <p className="text-xs text-muted">{formatMoeda(totalPendente)}</p>
      </div>

      <DoacoesLista pendentes={pendentes} recentes={recentes} />
    </div>
  );
}
