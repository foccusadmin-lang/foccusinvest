import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda, formatData } from "@/lib/format";
import { SaqueActions } from "./saque-actions";

type SaqueComUsuario = Prisma.SolicitacaoSaqueGetPayload<{
  include: { user: { select: { name: true; email: true } } };
}>;

const statusStyle: Record<string, string> = {
  SOLICITADO: "bg-sky-500/15 text-sky-300",
  APROVADO: "bg-amber-500/15 text-amber-300",
  PAGO: "bg-emerald-500/15 text-emerald-300",
  RECUSADO: "bg-red-500/15 text-red-300",
  CANCELADO: "bg-white/10 text-muted",
};

const tipoLabel: Record<string, string> = {
  CAPITAL: "Capital",
  RENDIMENTO: "Rendimento",
  BONUS: "Bônus",
};

export default async function RestritoSaquesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const saques = await prisma.solicitacaoSaque.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { criadoEm: "desc" },
    take: 100,
  });

  const pendentes = saques.filter((s) => s.status === "SOLICITADO" || s.status === "APROVADO");
  const historico = saques.filter((s) => s.status === "PAGO" || s.status === "RECUSADO" || s.status === "CANCELADO");

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Saques</h1>
      <p className="mt-1 text-sm text-muted">
        {pendentes.length} solicitação(ões) aguardando ação.
      </p>

      <Tabela titulo="Pendentes" saques={pendentes} vazio="Nenhuma solicitação pendente." />
      <div className="mt-8">
        <Tabela titulo="Histórico" saques={historico} vazio="Nenhum saque processado ainda." />
      </div>
    </div>
  );
}

function Tabela({
  titulo,
  saques,
  vazio,
}: {
  titulo: string;
  saques: SaqueComUsuario[];
  vazio: string;
}) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted">{titulo}</p>
      {saques.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
          {vazio}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Investidor</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Chave Pix</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Solicitado em</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {saques.map((s) => (
                <tr key={s.id} className="bg-surface">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{s.user.name ?? "—"}</p>
                    <p className="text-xs text-muted">{s.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {tipoLabel[s.tipo]}
                    {s.emergencial && (
                      <span className="ml-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-300">
                        Emergência
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">
                    {formatMoeda(s.valor, s.moeda as "BRL")}
                    {s.emergencial && s.valorBruto != null && s.taxaAntecipacao != null && (
                      <p className="mt-0.5 text-[11px] font-normal text-amber-300">
                        Bruto {formatMoeda(s.valorBruto)} · Taxa Antecipação -{formatMoeda(s.taxaAntecipacao)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {s.emergencial ? "—" : s.motivoEmergencia ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyle[s.status]}`}
                    >
                      {s.status}
                    </span>
                    {s.justificativaRecusa && (
                      <p className="mt-1 max-w-[220px] text-xs text-muted">
                        {s.justificativaRecusa}
                      </p>
                    )}
                    {s.emergencial && s.motivoEmergencia && (
                      <p className="mt-1 max-w-[220px] text-xs text-red-200/80">
                        Motivo: {s.motivoEmergencia}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{formatData(s.criadoEm)}</td>
                  <td className="px-4 py-3">
                    <SaqueActions saqueId={s.id} status={s.status} />
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
