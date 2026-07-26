import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda, formatData } from "@/lib/format";

type Lancamento = {
  id: string;
  data: Date;
  tipo: string;
  usuario: string;
  valor: number;
  detalhe: string;
  cor: string;
};

export default async function RestritoHistoricoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const [aplicacoes, saques, creditos, distribuicoes] = await Promise.all([
    prisma.aplicacao.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { criadoEm: "desc" },
      take: 50,
    }),
    prisma.solicitacaoSaque.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { criadoEm: "desc" },
      take: 50,
    }),
    prisma.creditoCarteira.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { criadoEm: "desc" },
      take: 50,
    }),
    prisma.distribuicaoMensal.findMany({
      include: { criadoPor: { select: { name: true, email: true } } },
      orderBy: { criadoEm: "desc" },
      take: 50,
    }),
  ]);

  const lancamentos: Lancamento[] = [
    ...aplicacoes.map((a) => ({
      id: `ap-${a.id}`,
      data: a.criadoEm,
      tipo: a.origem === "REAPLICACAO" ? "Reaplicação" : "Aplicação",
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Histórico completo</h1>
      <p className="mt-1 text-sm text-muted">
        Últimos {lancamentos.length} lançamentos de toda a plataforma.
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
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
                  Nenhum lançamento ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
