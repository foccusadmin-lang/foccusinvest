import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TransferenciaForm, type UsuarioTransferencia } from "./transferencia-form";

export default async function RestritoTransferenciaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const [usuarios, capitaisPorUsuario] = await Promise.all([
    prisma.user.findMany({
      where: { statusCadastro: "APROVADO", perfil: { not: "ADMIN" } },
      include: { pessoaFisica: true, pessoaJuridica: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.aplicacao.groupBy({
      by: ["userId"],
      where: { status: "CONFIRMADA" },
      _sum: { valor: true },
    }),
  ]);

  const capitalPorId = new Map(capitaisPorUsuario.map((c) => [c.userId, c._sum.valor ?? 0]));

  const lista: UsuarioTransferencia[] = usuarios.map((u) => ({
    id: u.id,
    nome: u.pessoaFisica?.nomeCompleto ?? u.pessoaJuridica?.razaoSocial ?? u.name ?? u.email,
    email: u.email,
    capital: capitalPorId.get(u.id) ?? 0,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Transferência de Saldo</h1>
      <p className="mt-1 text-sm text-muted">
        Move capital de um investidor pra outro. Só entre contas ativas (cadastro verificado).
      </p>

      <TransferenciaForm usuarios={lista} />
    </div>
  );
}
