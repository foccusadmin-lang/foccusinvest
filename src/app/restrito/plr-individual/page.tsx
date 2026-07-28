import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PlrIndividualForm } from "./plr-form";

export default async function RestritoPlrIndividualPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const [usuarios, capitaisPorUsuario] = await Promise.all([
    prisma.user.findMany({
      include: { pessoaFisica: true, pessoaJuridica: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.aplicacao.groupBy({
      by: ["userId"],
      where: { status: { in: ["CONFIRMADA", "SAQUE_SOLICITADO"] } },
      _sum: { valor: true },
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
    </div>
  );
}
