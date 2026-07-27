import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda } from "@/lib/format";

function chaveMes(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

function labelMes(chave: string): string {
  const [ano, mes] = chave.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(ano, mes - 1, 1));
}

function ultimosNMeses(n: number): string[] {
  const hoje = new Date();
  const chaves: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    chaves.push(chaveMes(d));
  }
  return chaves;
}

function BarraSimples({
  dados,
  corBarra,
  formatarValor,
}: {
  dados: { label: string; valor: number }[];
  corBarra: string;
  formatarValor: (v: number) => string;
}) {
  const max = Math.max(...dados.map((d) => d.valor), 1);
  return (
    <div className="flex items-end justify-between gap-2" style={{ height: 160 }}>
      {dados.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10px] text-muted">{d.valor > 0 ? formatarValor(d.valor) : ""}</span>
          <div
            className={`w-full rounded-t-md ${corBarra}`}
            style={{ height: Math.max((d.valor / max) * 120, d.valor > 0 ? 4 : 0) }}
          />
          <span className="text-[10px] uppercase text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default async function RestritoAnalisesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const seisMesesAtras = new Date();
  seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

  const [usuarios, aplicacoes, saques] = await Promise.all([
    prisma.user.findMany({
      where: { perfil: { not: "ADMIN" }, createdAt: { gte: seisMesesAtras } },
      select: { createdAt: true },
    }),
    prisma.aplicacao.findMany({
      where: { criadoEm: { gte: seisMesesAtras }, status: { in: ["CONFIRMADA", "SAQUE_SOLICITADO"] } },
      select: { criadoEm: true, valor: true },
    }),
    prisma.solicitacaoSaque.groupBy({ by: ["status"], _sum: { valor: true }, _count: true }),
  ]);

  const meses = ultimosNMeses(6);

  const usuariosPorMes = new Map<string, number>();
  for (const u of usuarios) {
    const chave = chaveMes(u.createdAt);
    usuariosPorMes.set(chave, (usuariosPorMes.get(chave) ?? 0) + 1);
  }

  const capitalPorMes = new Map<string, number>();
  for (const a of aplicacoes) {
    const chave = chaveMes(a.criadoEm);
    capitalPorMes.set(chave, (capitalPorMes.get(chave) ?? 0) + a.valor);
  }

  const dadosUsuarios = meses.map((m) => ({ label: labelMes(m), valor: usuariosPorMes.get(m) ?? 0 }));
  const dadosCapital = meses.map((m) => ({ label: labelMes(m), valor: capitalPorMes.get(m) ?? 0 }));

  const totalCapitalPeriodo = dadosCapital.reduce((acc, d) => acc + d.valor, 0);
  const totalNovosUsuarios = dadosUsuarios.reduce((acc, d) => acc + d.valor, 0);

  const statusLabel: Record<string, string> = {
    SOLICITADO: "Solicitado",
    APROVADO: "Aprovado",
    PAGO: "Pago",
    RECUSADO: "Recusado",
    CANCELADO: "Cancelado",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Gráficos e Análises</h1>
      <p className="mt-1 text-sm text-muted">Visão geral dos últimos 6 meses da plataforma.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Novos investidores no período
          </p>
          <p className="mt-1 text-2xl font-bold text-sky-300">{totalNovosUsuarios}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Capital aportado no período
          </p>
          <p className="mt-1 text-2xl font-bold text-gold-light">{formatMoeda(totalCapitalPeriodo)}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Novos investidores por mês</h2>
          <BarraSimples dados={dadosUsuarios} corBarra="bg-sky-500" formatarValor={(v) => String(v)} />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Capital aportado por mês</h2>
          <BarraSimples
            dados={dadosCapital}
            corBarra="bg-gradient-to-t from-[#93731f] to-[#f2d675]"
            formatarValor={(v) => formatMoeda(v)}
          />
        </div>
      </div>

      <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
        Saques por status (histórico completo)
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {saques.map((s) => (
          <div key={s.status} className="rounded-xl border border-border bg-surface p-4 text-center">
            <p className="text-xs text-muted">{statusLabel[s.status] ?? s.status}</p>
            <p className="mt-1 text-lg font-bold text-foreground">{s._count}</p>
            <p className="text-xs text-muted">{formatMoeda(s._sum.valor ?? 0)}</p>
          </div>
        ))}
        {saques.length === 0 && (
          <p className="col-span-full text-sm text-muted">Nenhum saque registrado ainda.</p>
        )}
      </div>
    </div>
  );
}
