import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda, formatData } from "@/lib/format";
import { getResumoCarteira } from "@/lib/carteira";
import { BuscaInvestidor } from "./busca-investidor";
import { DestaqueInvestidor, type ResumoInvestidor } from "@/components/admin/destaque-investidor";

type Lancamento = {
  id: string;
  data: Date;
  tipo: string;
  usuario: string;
  valor: number;
  detalhe: string;
  cor: string;
};

export default async function RestritoHistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const { q } = await searchParams;
  const busca = (q ?? "").trim();

  const filtroUsuario = busca
    ? { user: { OR: [{ name: { contains: busca, mode: "insensitive" as const } }, { email: { contains: busca, mode: "insensitive" as const } }] } }
    : {};
  const limite = busca ? 500 : 50;

  const [aplicacoes, saques, creditos, distribuicoes] = await Promise.all([
    prisma.aplicacao.findMany({
      where: filtroUsuario,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { criadoEm: "desc" },
      take: limite,
      omit: { comprovante: true },
    }),
    prisma.solicitacaoSaque.findMany({
      where: filtroUsuario,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { criadoEm: "desc" },
      take: limite,
    }),
    prisma.creditoCarteira.findMany({
      where: filtroUsuario,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { criadoEm: "desc" },
      take: limite,
    }),
    busca
      ? Promise.resolve([])
      : prisma.distribuicaoMensal.findMany({
          include: { criadoPor: { select: { name: true, email: true } } },
          orderBy: { criadoEm: "desc" },
          take: limite,
        }),
  ]);

  const lancamentos: Lancamento[] = [
    ...aplicacoes.map((a) => ({
      id: `ap-${a.id}`,
      data: a.criadoEm,
      tipo:
        a.origem === "REAPLICACAO"
          ? "Reaplicação"
          : a.origem === "REAPLICACAO_AUTOMATICA"
            ? "Reaplicação automática"
            : a.origem === "MIGRACAO"
              ? "Migração de saldo"
              : "Aplicação",
      usuario: a.user.name ?? a.user.email,
      valor: a.valor,
      detalhe: `Status: ${a.status}`,
      cor: "text-gold-light",
    })),
    ...saques.map((s) => ({
      id: `sq-${s.id}`,
      data: s.criadoEm,
      tipo: `Saque · ${s.tipo === "CAPITAL" ? "Capital" : "Rendimento"}`,
      usuario: s.user.name ?? s.user.email,
      valor: -s.valor,
      detalhe: `Status: ${s.status}`,
      cor: "text-red-300",
    })),
    ...creditos.map((c) => ({
      id: `cr-${c.id}`,
      data: c.criadoEm,
      tipo: c.tipo === "RENDIMENTO" ? "Crédito de rendimento" : "Crédito de bônus",
      usuario: c.user.name ?? c.user.email,
      valor: c.valor,
      detalhe: c.origem,
      cor: "text-emerald-300",
    })),
    ...distribuicoes.map((d) => ({
      id: `di-${d.id}`,
      data: d.criadoEm,
      tipo: "Distribuição lançada",
      usuario: d.criadoPor.name ?? d.criadoPor.email,
      valor: d.valorTotal,
      detalhe: `${d.percentual}% · ${formatData(d.periodoInicio)} a ${formatData(d.periodoFim)}`,
      cor: "text-sky-300",
    })),
  ].sort((a, b) => b.data.getTime() - a.data.getTime());

  // Quando o admin pesquisa por nome/e-mail, mostra um resumo em destaque de cada investidor
  // encontrado (nome, e-mail, CPF, capital, carência, disponível, rendimento, bônus e total) —
  // o histórico de lançamentos (já filtrado pra esses mesmos investidores) fica logo abaixo.
  let investidoresDestacados: ResumoInvestidor[] = [];
  if (busca) {
    const usuariosEncontrados = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: busca, mode: "insensitive" } },
          { email: { contains: busca, mode: "insensitive" } },
        ],
      },
      include: { pessoaFisica: true, pessoaJuridica: true },
      take: 10,
    });

    investidoresDestacados = await Promise.all(
      usuariosEncontrados.map(async (u) => {
        const resumo = await getResumoCarteira(u.id);
        return {
          id: u.id,
          nome: u.pessoaFisica?.nomeCompleto ?? u.pessoaJuridica?.razaoSocial ?? u.name ?? u.email,
          email: u.email,
          documento: u.pessoaFisica?.cpf ?? u.pessoaJuridica?.cnpj ?? "—",
          capital: resumo.capitalPrincipal,
          carencia: resumo.capitalCarencia,
          disponivel: resumo.capitalDisponivel,
          rendimentoDisponivel: resumo.distribuicoesDisponiveis,
          bonus: resumo.bonusIndicacao,
          total:
            resumo.capitalPrincipal +
            resumo.distribuicoesDisponiveis +
            resumo.bonusIndicacao +
            resumo.incentivoLiderancaDisponivel,
        };
      })
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Histórico completo</h1>
      <p className="mt-1 text-sm text-muted">
        {busca
          ? `${lancamentos.length} lançamento(s) encontrado(s) para "${busca}".`
          : `Últimos ${lancamentos.length} lançamentos de toda a plataforma.`}
      </p>

      <div className="mt-4">
        <BuscaInvestidor valorInicial={busca} />
      </div>

      {investidoresDestacados.length > 0 && (
        <div className="mt-6 space-y-4">
          {investidoresDestacados.map((inv) => (
            <DestaqueInvestidor key={inv.id} investidor={inv} />
          ))}
        </div>
      )}
      {busca && investidoresDestacados.length === 0 && (
        <p className="mt-6 rounded-2xl border border-border bg-surface p-5 text-center text-sm text-muted">
          Nenhum investidor encontrado com esse nome ou e-mail.
        </p>
      )}

      <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
        Histórico de transações
      </p>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Investidor</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Detalhe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lancamentos.map((l) => (
              <tr key={l.id} className="bg-surface">
                <td className="whitespace-nowrap px-4 py-3 text-muted">{formatData(l.data)}</td>
                <td className="px-4 py-3 text-foreground">{l.tipo}</td>
                <td className="px-4 py-3 text-muted">{l.usuario}</td>
                <td className={`px-4 py-3 font-semibold ${l.cor}`}>
                  {l.valor < 0 ? "-" : ""}
                  {formatMoeda(Math.abs(l.valor))}
                </td>
                <td className="px-4 py-3 text-xs text-muted">{l.detalhe}</td>
              </tr>
            ))}
            {lancamentos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  Nenhum lançamento encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
