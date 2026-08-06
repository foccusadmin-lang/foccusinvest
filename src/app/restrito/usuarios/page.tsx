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

  const agora = new Date();

  const [
    capitaisPorUsuario,
    creditosPorUsuario,
    capitalDisponivelPorUsuario,
    capitalCarenciaPorUsuario,
    aplicacoesElegiveis,
    liberacoesAtivas,
  ] = await Promise.all([
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
    prisma.aplicacao.groupBy({
      by: ["userId"],
      where: { status: "CONFIRMADA", liberaEm: { lte: agora } },
      _sum: { valor: true },
    }),
    prisma.aplicacao.groupBy({
      by: ["userId"],
      where: { status: "CONFIRMADA", liberaEm: { gt: agora } },
      _sum: { valor: true },
    }),
    prisma.aplicacao.findMany({
      where: { status: "CONFIRMADA" },
      select: { id: true, userId: true, valor: true, criadoEm: true, liberaEm: true },
      orderBy: { criadoEm: "asc" },
    }),
    prisma.liberacaoEmergencial.findMany({
      where: { status: "ATIVA" },
      orderBy: { criadoEm: "desc" },
    }),
  ]);

  const capitalPorId = new Map(capitaisPorUsuario.map((c) => [c.userId, c._sum.valor ?? 0]));
  const rendimentoPorId = new Map(
    creditosPorUsuario.filter((c) => c.tipo === "RENDIMENTO").map((c) => [c.userId, c._sum.valor ?? 0])
  );
  const bonusPorId = new Map(
    creditosPorUsuario.filter((c) => c.tipo === "BONUS").map((c) => [c.userId, c._sum.valor ?? 0])
  );
  const capitalDisponivelPorId = new Map(
    capitalDisponivelPorUsuario.map((c) => [c.userId, c._sum.valor ?? 0])
  );
  const capitalCarenciaPorId = new Map(
    capitalCarenciaPorUsuario.map((c) => [c.userId, c._sum.valor ?? 0])
  );

  const aplicacoesPorUsuario = new Map<string, LinhaUsuario["aplicacoesElegiveisEmergencia"]>();
  for (const a of aplicacoesElegiveis) {
    const lista = aplicacoesPorUsuario.get(a.userId) ?? [];
    lista.push({
      id: a.id,
      valor: a.valor,
      criadoEm: a.criadoEm.toISOString(),
      liberaEm: a.liberaEm.toISOString(),
      emCarencia: a.liberaEm > agora,
    });
    aplicacoesPorUsuario.set(a.userId, lista);
  }
  const liberacaoAtivaPorUsuario = new Map<string, LinhaUsuario["liberacaoEmergenciaAtiva"]>();
  for (const l of liberacoesAtivas) {
    if (liberacaoAtivaPorUsuario.has(l.userId)) continue; // mais recente já veio primeiro (orderBy desc)
    liberacaoAtivaPorUsuario.set(l.userId, {
      id: l.id,
      aplicacaoId: l.aplicacaoId,
      valorMaximo: l.valorMaximo,
      tipoSaque: l.tipoSaque,
      motivo: l.motivo,
      expiraEm: l.expiraEm.toISOString(),
    });
  }

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
    capitalDisponivel: capitalDisponivelPorId.get(u.id) ?? 0,
    capitalCarencia: capitalCarenciaPorId.get(u.id) ?? 0,
    rendimento: rendimentoPorId.get(u.id) ?? 0,
    bonus: bonusPorId.get(u.id) ?? 0,
    statusCadastro: u.statusCadastro,
    perfil: u.perfil,
    createdAt: u.createdAt,
    aplicacoesElegiveisEmergencia: aplicacoesPorUsuario.get(u.id) ?? [],
    liberacaoEmergenciaAtiva: liberacaoAtivaPorUsuario.get(u.id) ?? null,
    tipoPessoa: u.tipoPessoa,
    cpf: u.pessoaFisica?.cpf ?? "",
    dataNascimento: u.pessoaFisica
      ? u.pessoaFisica.dataNascimento.toISOString().slice(0, 10)
      : "",
    cnpj: u.pessoaJuridica?.cnpj ?? "",
    representanteLegal: u.pessoaJuridica?.representanteLegal ?? "",
    cpfRepresentante: u.pessoaJuridica?.cpfRepresentante ?? "",
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
      <p className="mt-1 text-sm text-muted">{usuarios.length} conta(s) cadastrada(s).</p>

      <UsuariosTable usuarios={linhas} />
    </div>
  );
}
