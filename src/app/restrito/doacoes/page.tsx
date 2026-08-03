import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda, formatData } from "@/lib/format";
import { AprovarRecusarDoacao } from "./aprovar-recusar";

const TIPO_LABEL: Record<string, string> = {
  SALDO_DISPONIVEL: "Doação com saldo",
  NOVA_APLICACAO: "Nova aplicação p/ entidade",
};

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  AGUARDANDO_PAGAMENTO: { label: "Aguardando pagamento", className: "bg-amber-500/15 text-amber-300" },
  EM_PROCESSAMENTO: { label: "Em processamento", className: "bg-sky-500/15 text-sky-300" },
  EM_ANALISE: { label: "Em análise", className: "bg-amber-500/15 text-amber-300" },
  CONFIRMADA: { label: "Confirmada", className: "bg-emerald-500/15 text-emerald-300" },
  CANCELADA: { label: "Cancelada", className: "bg-red-500/15 text-red-300" },
  ESTORNADA: { label: "Estornada", className: "bg-red-500/15 text-red-300" },
};

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
    }),
    prisma.doacao.findMany({
      where: { status: { in: ["CONFIRMADA", "CANCELADA", "ESTORNADA"] } },
      include: {
        doador: { select: { name: true, email: true } },
        entidade: { include: { user: { include: { pessoaJuridica: true } } } },
      },
      orderBy: { criadoEm: "desc" },
      take: 30,
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

      <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
        Comprovantes aguardando conferência
      </p>

      {pendentes.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
          Nenhuma doação aguardando aprovação.
        </p>
      ) : (
        <div className="space-y-3">
          {pendentes.map((d) => {
            const nomeEntidade =
              d.entidade.user.pessoaJuridica?.nomeFantasia ??
              d.entidade.user.pessoaJuridica?.razaoSocial ??
              d.entidade.user.email;
            return (
              <div
                key={d.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-foreground">
                    {d.doacaoAnonima ? "Doador anônimo" : d.doador.name ?? d.doador.email}
                  </p>
                  <p className="text-xs text-muted">Para {nomeEntidade}</p>
                  <p className="mt-1 text-lg font-bold text-gold-light">{formatMoeda(d.valorBruto)}</p>
                  <p className="text-xs text-muted">Enviado em {formatData(d.criadoEm)}</p>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <a
                    href={`/restrito/doacoes/${d.id}/comprovante`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-300 hover:bg-sky-500/25"
                  >
                    Ver comprovante
                  </a>
                  <AprovarRecusarDoacao id={d.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
        Histórico recente
      </p>

      {recentes.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
          Nenhuma doação processada ainda.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Doador</th>
                <th className="px-4 py-3">Entidade</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentes.map((d) => {
                const status = STATUS_LABEL[d.status] ?? { label: d.status, className: "bg-white/10 text-muted" };
                const nomeEntidade =
                  d.entidade.user.pessoaJuridica?.nomeFantasia ??
                  d.entidade.user.pessoaJuridica?.razaoSocial ??
                  d.entidade.user.email;
                return (
                  <tr key={d.id} className="bg-surface">
                    <td className="px-4 py-3 text-foreground">
                      {d.doacaoAnonima ? "Anônimo" : d.doador.name ?? d.doador.email}
                    </td>
                    <td className="px-4 py-3 text-muted">{nomeEntidade}</td>
                    <td className="px-4 py-3 text-xs text-muted">{TIPO_LABEL[d.tipoDoacao] ?? d.tipoDoacao}</td>
                    <td className="px-4 py-3 font-semibold text-gold-light">{formatMoeda(d.valorBruto)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${status.className}`}>
                        {status.label}
                      </span>
                      {d.motivoRecusa && <p className="mt-0.5 text-xs text-red-300/90">{d.motivoRecusa}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{formatData(d.criadoEm)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
