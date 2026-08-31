import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda } from "@/lib/format";
import { ReaplicacoesTabelas } from "./reaplicacoes-tabelas";

export default async function RestritoReaplicacoesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const [reaplicacoes, capitaisPorUsuario, rendimentoDisponivelPorUsuario] = await Promise.all([
    prisma.aplicacao.findMany({
      where: { origem: { in: ["REAPLICACAO", "REAPLICACAO_AUTOMATICA"] } },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { criadoEm: "desc" },
      omit: { comprovante: true },
    }),
    prisma.aplicacao.groupBy({
      by: ["userId"],
      where: { status: { in: ["CONFIRMADA", "SAQUE_SOLICITADO"] } },
      _sum: { valor: true },
    }),
    prisma.creditoCarteira.groupBy({
      by: ["userId"],
      where: { tipo: "RENDIMENTO", utilizadoEm: null, solicitacaoSaqueId: null },
      _sum: { valor: true },
    }),
  ]);

  const capitalPorId = new Map(capitaisPorUsuario.map((c) => [c.userId, c._sum.valor ?? 0]));
  const rendimentoDisponivelPorId = new Map(
    rendimentoDisponivelPorUsuario.map((c) => [c.userId, c._sum.valor ?? 0])
  );

  const porUsuario = new Map<
    string,
    { nome: string; email: string; totalReaplicado: number; quantidade: number }
  >();
  for (const r of reaplicacoes) {
    const atual = porUsuario.get(r.userId);
    if (atual) {
      atual.totalReaplicado += r.valor;
      atual.quantidade += 1;
    } else {
      porUsuario.set(r.userId, {
        nome: r.user.name ?? r.user.email,
        email: r.user.email,
        totalReaplicado: r.valor,
        quantidade: 1,
      });
    }
  }

  const resumoPorUsuario = Array.from(porUsuario.entries())
    .map(([userId, dados]) => ({
      userId,
      ...dados,
      rendimentoDisponivel: rendimentoDisponivelPorId.get(userId) ?? 0,
      capitalAtual: capitalPorId.get(userId) ?? 0,
    }))
    .sort((a, b) => b.totalReaplicado - a.totalReaplicado);

  const total = reaplicacoes.reduce((acc, r) => acc + r.valor, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Reaplicações</h1>
      <p className="mt-1 text-sm text-muted">
        {reaplicacoes.length} reaplicação(ões) de {resumoPorUsuario.length} investidor(es) · Total{" "}
        {formatMoeda(total)}
      </p>

      {resumoPorUsuario.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
          Ninguém reaplicou ainda.
        </p>
      ) : (
        <ReaplicacoesTabelas resumoPorUsuario={resumoPorUsuario} reaplicacoes={reaplicacoes} />
      )}
    </div>
  );
}
