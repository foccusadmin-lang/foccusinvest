import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda } from "@/lib/format";
import { CodigoIndicacaoActions } from "./codigo-actions";

export default async function RestritoIndicacoesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const [usuarios, bonusPorUsuario] = await Promise.all([
    prisma.user.findMany({
      where: { perfil: { not: "ADMIN" } },
      include: {
        indicadoPor: { select: { name: true, email: true } },
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

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Indicado por</th>
              <th className="px-4 py-3">Indicados diretos</th>
              <th className="px-4 py-3">Bônus recebido</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {usuarios.map((u) => (
              <tr key={u.id} className="bg-surface">
                <td className="px-4 py-3 font-medium text-foreground">{u.name ?? u.email}</td>
                <td className="px-4 py-3 font-mono text-xs text-gold-light">
                  {u.codigoIndicacao ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {u.indicadoPor ? u.indicadoPor.name ?? u.indicadoPor.email : "—"}
                </td>
                <td className="px-4 py-3 text-foreground">{u.indicados.length}</td>
                <td className="px-4 py-3 font-semibold text-fuchsia-300">
                  {formatMoeda(bonusPorId.get(u.id) ?? 0)}
                </td>
                <td className="px-4 py-3">
                  <CodigoIndicacaoActions userId={u.id} codigoAtual={u.codigoIndicacao} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
