import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { maskCPF, maskCNPJ } from "@/lib/cpf-cnpj";
import { formatData } from "@/lib/format";
import { StatusActions } from "./status-actions";

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

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
      <p className="mt-1 text-sm text-muted">{usuarios.length} conta(s) cadastrada(s).</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Perfil</th>
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

              return (
                <tr key={u.id} className="bg-surface">
                  <td className="px-4 py-3 font-medium text-foreground">{nome}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{documento}</td>
                  <td className="px-4 py-3 text-muted">{u.email}</td>
                  <td className="px-4 py-3 text-muted">{u.perfil}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyle[u.statusCadastro]}`}
                    >
                      {u.statusCadastro}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{formatData(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <StatusActions
                      usuarioId={u.id}
                      statusCadastro={u.statusCadastro}
                      perfil={u.perfil}
                    />
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
