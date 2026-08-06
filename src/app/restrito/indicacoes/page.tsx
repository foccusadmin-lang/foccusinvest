import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda } from "@/lib/format";
import { IndicacoesLista } from "./indicacoes-lista";

export default async function RestritoIndicacoesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const [usuarios, bonusPorUsuario] = await Promise.all([
    prisma.user.findMany({
      where: { perfil: { not: "ADMIN" } },
      include: {
        indicadoPor: { select: { name: true, email: true, codigoIndicacao: true } },
        indicados: { select: { id: true } },
      },
      orderBy: { indicados: { _count: "desc" } },
    }),
    prisma.creditoCarteira.groupBy({
      by: ["userId"],
      where: { tipo: "BONUS" },
      _sum: { valor: true },
    }),
  ]);

  const bonusPorId = new Map(bonusPorUsuario.map((b) => [b.userId, b._sum.valor ?? 0]));
  const comIndicados = usuarios.filter((u) => u.indicados.length > 0);
  const totalBonusPago = bonusPorUsuario.reduce((acc, b) => acc + (b._sum.valor ?? 0), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Indicações</h1>
      <p className="mt-1 text-sm text-muted">
        Acompanhe os códigos de indicação, quem indicou quem, e o bônus já recebido por cada
        investidor. O crédito do bônus ainda é lançado manualmente pelo botão de ajuste de saldo
        em Usuários (aguardando você definir a regra automática de % por aporte do indicado).
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Investidores com indicações
          </p>
          <p className="mt-1 text-2xl font-bold text-fuchsia-300">{comIndicados.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Total de bônus já pago
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">{formatMoeda(totalBonusPago)}</p>
        </div>
      </div>

      <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
        Códigos e indicações
      </p>

      <IndicacoesLista usuarios={usuarios} bonusPorId={bonusPorId} />
    </div>
  );
}
