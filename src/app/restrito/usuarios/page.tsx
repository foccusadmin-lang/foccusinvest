import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { maskCPF, maskCNPJ } from "@/lib/cpf-cnpj";
import { UsuariosTable, type LinhaUsuario } from "./usuarios-table";

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

  const linhas: LinhaUsuario[] = usuarios.map((u) => ({
    id: u.id,
    nome: u.pessoaFisica?.nomeCompleto ?? u.pessoaJuridica?.razaoSocial ?? u.name ?? "—",
    email: u.email,
    codigo: u.codigoIndicacao ?? "",
    documento: u.pessoaFisica
      ? maskCPF(u.pessoaFisica.cpf)
      : u.pessoaJuridica
        ? maskCNPJ(u.pessoaJuridica.cnpj)
        : "—",
    telefone: u.pessoaFisica?.telefone ?? u.pessoaJuridica?.telefone ?? "",
    endereco: u.pessoaFisica?.endereco ?? u.pessoaJuridica?.endereco ?? "",
    capital: capitalPorId.get(u.id) ?? 0,
    rendimento: rendimentoPorId.get(u.id) ?? 0,
    bonus: bonusPorId.get(u.id) ?? 0,
    statusCadastro: u.statusCadastro,
    perfil: u.perfil,
    createdAt: u.createdAt,
    saqueEmergencialLiberado: u.saqueEmergencialLiberado,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
      <p className="mt-1 text-sm text-muted">{usuarios.length} conta(s) cadastrada(s).</p>

      <UsuariosTable usuarios={linhas} />
    </div>
  );
}
