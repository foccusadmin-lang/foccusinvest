import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda, formatData } from "@/lib/format";

export default async function RestritoReaplicacoesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const reaplicacoes = await prisma.aplicacao.findMany({
    where: { origem: "REAPLICACAO" },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { criadoEm: "desc" },
  });

  const total = reaplicacoes.reduce((acc, r) => acc + r.valor, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Reaplicações</h1>
      <p className="mt-1 text-sm text-muted">
        {reaplicacoes.length} reaplicação(ões) · Total {formatMoeda(total)}
      </p>

      {reaplicacoes.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
          Ninguém reaplicou ainda.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Investidor</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reaplicacoes.map((r) => (
                <tr key={r.id} className="bg-surface">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{r.user.name ?? "—"}</p>
                    <p className="text-xs text-muted">{r.user.email}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gold-light">
                    {formatMoeda(r.valor, r.moeda as "BRL")}
                  </td>
                  <td className="px-4 py-3 text-muted">{formatData(r.criadoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
