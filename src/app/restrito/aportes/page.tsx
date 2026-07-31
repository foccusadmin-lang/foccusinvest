import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda, formatData } from "@/lib/format";
import { AprovarRejeitarAporte } from "./comprovante-actions";
import { IndicacaoRetroativaButton } from "./indicacao-retroativa-button";

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

      <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
        Comprovantes aguardando conferência
      </p>

      {pendentes.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
          Nenhum aporte aguardando aprovação.
        </p>
      ) : (
        <div className="space-y-3">
          {pendentes.map((a) => (
            <div
              key={a.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-foreground">{a.user.name ?? a.user.email}</p>
                <p className="text-xs text-muted">{a.user.email}</p>
                <p className="mt-1 text-lg font-bold text-gold-light">{formatMoeda(a.valor)}</p>
                <p className="text-xs text-muted">Enviado em {formatData(a.criadoEm)}</p>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <a
                  href={`/restrito/aportes/${a.id}/comprovante`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-300 hover:bg-sky-500/25"
                >
                  Ver comprovante
                </a>
                <AprovarRejeitarAporte id={a.id} />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
        Histórico recente
      </p>

      {recentes.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
          Nenhum aporte processado ainda.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Investidor</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Processado por</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentes.map((a) => (
                <tr key={a.id} className="bg-surface">
                  <td className="px-4 py-3 text-foreground">{a.user.name ?? a.user.email}</td>
                  <td className="px-4 py-3 font-semibold text-gold-light">
                    {formatMoeda(a.valor)}
                  </td>
                  <td className="px-4 py-3">
                    {a.status === "CONFIRMADA" ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300">
                        Aprovado
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-500/15 px-2 py-1 text-xs font-semibold text-red-300">
                        Rejeitado{a.motivoRejeicao ? `: ${a.motivoRejeicao}` : ""}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {a.aprovadoPor ? a.aprovadoPor.name ?? a.aprovadoPor.email : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {a.aprovadoEm ? formatData(a.aprovadoEm) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {a.status === "CONFIRMADA" && <IndicacaoRetroativaButton aplicacaoId={a.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
