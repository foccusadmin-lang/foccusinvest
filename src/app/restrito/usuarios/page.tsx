import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { maskCPF, maskCNPJ } from "@/lib/cpf-cnpj";
import { formatData, formatMoeda } from "@/lib/format";
import { StatusActions } from "./status-actions";
import { AjusteSaldoButton } from "./ajuste-modal";
import { SaqueEmergencialToggle } from "./saque-emergencial-toggle";

const statusStyle: Record<string, string> = {
  INCOMPLETO: "bg-white/10 text-muted",
  PENDENTE: "bg-sky-500/15 text-sky-300",
  APROVADO: "bg-emerald-500/15 text-emerald-300",
  SUSPENSO: "bg-red-500/15 text-red-300",
  REJEITADO: "bg-red-500/15 text-red-300",
};

export default async function RestritoUsuariosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const usuarios = await prisma.user.findMany({
    where: { perfil: { not: "ADMIN" } },
    include: { pessoaFisica: true, pessoaJuridica: true },
    orderBy: { createdAt: "desc" },
  });

  const [capitaisPorUsuario, creditosPorUsuario] = await Promise.all([
    prisma.aplicacao.groupBy({
      by: ["userId"],
      where: { status: { in: ["CONFIRMADA", "SAQUE_SOLICITADO"] } },
      _sum: { valor: true },
    }),
    prisma.creditoCarteira.groupBy({
      by: ["userId", "tipo"],
      where: { utilizadoEm: null, solicitacaoSaqueId: null },
      _sum: { valor: true },
    }),
  ]);

  const capitalPorId = new Map(capitaisPorUsuario.map((c) => [c.userId, c._sum.valor ?? 0]));
  const rendimentoPorId = new Map(
    creditosPorUsuario.filter((c) => c.tipo === "RENDIMENTO").map((c) => [c.userId, c._sum.valor ?? 0])
  );
  const bonusPorId = new Map(
    creditosPorUsuario.filter((c) => c.tipo === "BONUS").map((c) => [c.userId, c._sum.valor ?? 0])
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
      <p className="mt-1 text-sm text-muted">{usuarios.length} conta(s) cadastrada(s).</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Saldos</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Desde</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {usuarios.map((u) => {
              const documento = u.pessoaFisica
                ? maskCPF(u.pessoaFisica.cpf)
                : u.pessoaJuridica
                  ? maskCNPJ(u.pessoaJuridica.cnpj)
                  : "—";
              const nome =
                u.pessoaFisica?.nomeCompleto ??
                u.pessoaJuridica?.razaoSocial ??
                u.name ??
                "—";

              const capital = capitalPorId.get(u.id) ?? 0;
              const rendimento = rendimentoPorId.get(u.id) ?? 0;
              const bonus = bonusPorId.get(u.id) ?? 0;

              return (
                <tr key={u.id} className="bg-surface">
                  <td className="px-4 py-3 font-medium text-foreground">{nome}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{documento}</td>
                  <td className="px-4 py-3 text-muted">{u.email}</td>
                  <td className="px-4 py-3 text-xs">
                    <p>
                      <span className="text-muted">Capital: </span>
                      <span className="font-semibold text-emerald-300">{formatMoeda(capital)}</span>
                    </p>
                    <p>
                      <span className="text-muted">PLR: </span>
                      <span className="font-semibold text-gold-light">{formatMoeda(rendimento)}</span>
                    </p>
                    <p>
                      <span className="text-muted">Bônus: </span>
                      <span className="font-semibold text-fuchsia-300">{formatMoeda(bonus)}</span>
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyle[u.statusCadastro]}`}
                    >
                      {u.statusCadastro}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{formatData(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-start gap-2">
                      <AjusteSaldoButton
                        usuario={{ id: u.id, nome, email: u.email, capital, rendimento, bonus }}
                      />
                      <StatusActions
                        usuarioId={u.id}
                        statusCadastro={u.statusCadastro}
                        perfil={u.perfil}
                      />
                      <SaqueEmergencialToggle
                        userId={u.id}
                        liberado={u.saqueEmergencialLiberado}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
