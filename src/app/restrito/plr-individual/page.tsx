import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PlrIndividualForm } from "./plr-form";
import { LancamentosRecentes } from "./lancamentos-recentes";
import { PlrPeriodoLista } from "./periodo-lista";

export default async function RestritoPlrIndividualPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const [usuarios, capitaisPorUsuario, lancamentosRecentes, lancamentosPorPeriodo] = await Promise.all([
    prisma.user.findMany({
      include: { pessoaFisica: true, pessoaJuridica: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.aplicacao.groupBy({
      by: ["userId"],
      where: { status: { in: ["CONFIRMADA", "SAQUE_SOLICITADO"] } },
      _sum: { valor: true },
    }),
    // Sem corte por data — cada lançamento já guarda a própria data (a escolhida no
    // formulário), e a lista agrupada por dia (com todos os grupos recolhidos por padrão)
    // fica leve mesmo mostrando o histórico completo.
    prisma.creditoCarteira.findMany({
      where: {
        tipo: "RENDIMENTO",
        origem: { startsWith: "PLR manual" },
      },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { criadoEm: "desc" },
      take: 2000,
    }),
    // Lançamentos "por período" (data início/fim) do PLR Individual — viram uma Distribuição
    // igual à de /restrito/distribuicoes, só que restrita aos usuários selecionados; marcados
    // pelo prefixo em resultadoApurado pra não misturar com Distribuições normais.
    prisma.distribuicaoMensal.findMany({
      where: { resultadoApurado: { startsWith: "PLR individual (admin)" } },
      include: { _count: { select: { participantes: true } } },
      orderBy: { criadoEm: "desc" },
      take: 200,
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
        ou todos de uma vez. Instantâneo credita na hora, como rendimento disponível — útil pra
        bonificar um mês bom, ou corrigir manualmente em caso de bug no processamento automático.
        Por período (data início e data fim) programa o mesmo percentual diluído dia a dia,
        exatamente como uma Distribuição, só que restrita a quem for selecionado.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <PlrIndividualForm usuarios={usuariosFormatados} />
      </div>

      <p className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
        Lançamentos por período
      </p>
      <PlrPeriodoLista
        itens={lancamentosPorPeriodo.map((d) => ({
          id: d.id,
          percentual: d.percentual,
          valorTotal: d.valorTotal,
          periodoInicio: d.periodoInicio,
          periodoFim: d.periodoFim,
          resultadoApurado: d.resultadoApurado,
          criadoEm: d.criadoEm,
          qtdParticipantes: d._count.participantes,
        }))}
      />

      <p className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
        Lançamentos instantâneos (todos, agrupados por data)
      </p>

      <LancamentosRecentes lancamentos={lancamentosRecentes} />
    </div>
  );
}
