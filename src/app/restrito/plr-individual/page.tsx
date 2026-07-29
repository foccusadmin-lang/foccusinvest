import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda, formatData } from "@/lib/format";
import { PlrIndividualForm } from "./plr-form";
import { ExcluirCreditoButton } from "./excluir-button";

export default async function RestritoPlrIndividualPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const [usuarios, capitaisPorUsuario, lancamentosRecentes] = await Promise.all([
    prisma.user.findMany({
      include: { pessoaFisica: true, pessoaJuridica: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.aplicacao.groupBy({
      by: ["userId"],
      where: { status: { in: ["CONFIRMADA", "SAQUE_SOLICITADO"] } },
      _sum: { valor: true },
    }),
    prisma.creditoCarteira.findMany({
      where: { tipo: "RENDIMENTO", origem: { startsWith: "PLR manual" } },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { criadoEm: "desc" },
      take: 50,
    }),
  ]);

  const capitalPorId = new Map(capitaisPorUsuario.map((c) => [c.userId, c._sum.valor ?? 0]));

  const usuariosFormatados = usuarios.map((u) => ({
    id: u.id,
    nome: u.pessoaFisica?.nomeCompleto ?? u.pessoaJuridica?.razaoSocial ?? u.name ?? u.email,
    email: u.email,
    codigo: u.codigoIndicacao ?? "—",
    capital: capitalPorId.get(u.id) ?? 0,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">PLR Individual</h1>
      <p className="mt-1 text-sm text-muted">
        Aplique um percentual de PLR sobre o capital de cada investidor selecionado — um por um
        ou todos de uma vez. Útil pra bonificar um mês bom, ou lançar manualmente em caso de bug
        no processamento automático. O valor é creditado na hora como rendimento disponível.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <PlrIndividualForm usuarios={usuariosFormatados} />
      </div>

      <p className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
        Lançamentos recentes
      </p>

      {lancamentosRecentes.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
          Nenhum PLR individual lançado ainda.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Investidor</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Detalhe</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lancamentosRecentes.map((c) => {
                const usado = Boolean(c.utilizadoEm || c.solicitacaoSaqueId);
                return (
                  <tr key={c.id} className="bg-surface">
                    <td className="px-4 py-3 text-foreground">{c.user.name ?? c.user.email}</td>
                    <td className="px-4 py-3 font-semibold text-gold-light">
                      {formatMoeda(c.valor)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{c.origem}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted">
                      {formatData(c.criadoEm)}
                    </td>
                    <td className="px-4 py-3">
                      {usado ? (
                        <span className="rounded-full bg-white/10 px-2 py-1 text-xs font-semibold text-muted">
                          Já usado
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300">
                          Disponível
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!usado && <ExcluirCreditoButton creditoId={c.id} />}
                    </td>
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
