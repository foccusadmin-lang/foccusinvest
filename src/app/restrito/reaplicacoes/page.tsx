import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda, formatData } from "@/lib/format";

export default async function RestritoReaplicacoesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const [reaplicacoes, capitaisPorUsuario, rendimentoDisponivelPorUsuario] = await Promise.all([
    prisma.aplicacao.findMany({
      where: { origem: "REAPLICACAO" },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.aplicacao.groupBy({
      by: ["userId"],
      where: { status: { in: ["CONFIRMADA", "SAQUE_SOLICITADO"] } },
      _sum: { valor: true },
    }),
    prisma.creditoCarteira.groupBy({
      by: ["userId"],
      where: { tipo: "RENDIMENTO", utilizadoEm: null, solicitacaoSaqueId: null },
      _sum: { valor: true },
    }),
  ]);

  const capitalPorId = new Map(capitaisPorUsuario.map((c) => [c.userId, c._sum.valor ?? 0]));
  const rendimentoDisponivelPorId = new Map(
    rendimentoDisponivelPorUsuario.map((c) => [c.userId, c._sum.valor ?? 0])
  );

  const porUsuario = new Map<
    string,
    { nome: string; email: string; totalReaplicado: number; quantidade: number }
  >();
  for (const r of reaplicacoes) {
    const atual = porUsuario.get(r.userId);
    if (atual) {
      atual.totalReaplicado += r.valor;
      atual.quantidade += 1;
    } else {
      porUsuario.set(r.userId, {
        nome: r.user.name ?? r.user.email,
        email: r.user.email,
        totalReaplicado: r.valor,
        quantidade: 1,
      });
    }
  }

  const resumoPorUsuario = Array.from(porUsuario.entries())
    .map(([userId, dados]) => ({
      userId,
      ...dados,
      rendimentoDisponivel: rendimentoDisponivelPorId.get(userId) ?? 0,
      capitalAtual: capitalPorId.get(userId) ?? 0,
    }))
    .sort((a, b) => b.totalReaplicado - a.totalReaplicado);

  const total = reaplicacoes.reduce((acc, r) => acc + r.valor, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Reaplicações</h1>
      <p className="mt-1 text-sm text-muted">
        {reaplicacoes.length} reaplicação(ões) de {resumoPorUsuario.length} investidor(es) · Total{" "}
        {formatMoeda(total)}
      </p>

      {resumoPorUsuario.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
          Ninguém reaplicou ainda.
        </p>
      ) : (
        <>
          <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
            Por investidor
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3">Investidor</th>
                  <th className="px-4 py-3">Total reaplicado</th>
                  <th className="px-4 py-3">Rend. disponível (sobrou)</th>
                  <th className="px-4 py-3">Capital atual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {resumoPorUsuario.map((u) => (
                  <tr key={u.userId} className="bg-surface">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{u.nome}</p>
                      <p className="text-xs text-muted">
                        {u.email} · {u.quantidade}x
                      </p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gold-light">
                      {formatMoeda(u.totalReaplicado)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-300">
                      {formatMoeda(u.rendimentoDisponivel)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {formatMoeda(u.capitalAtual)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
            Cada reaplicação
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border">
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
        </>
      )}
    </div>
  );
}
