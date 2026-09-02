import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listarBenchmarks, obterComparativoRentabilidade } from "@/lib/indices-mercado";
import { BenchmarksForm } from "./benchmarks-form";
import { BenchmarksLista } from "./benchmarks-lista";
import { FoccusReferencia } from "./foccus-referencia";

export default async function RestritoIndicesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const [benchmarks, comparativo] = await Promise.all([
    listarBenchmarks(),
    obterComparativoRentabilidade(12),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Rentabilidade vs Índices</h1>
      <p className="mt-1 text-sm text-muted">
        Lance manualmente o valor mensal de cada índice de mercado (CDI, CDB, IPCA, Ibovespa) —
        não há integração automática com nenhuma fonte de dados. Esses valores aparecem no
        comparativo do painel do investidor ao lado da rentabilidade que já foi de fato
        distribuída (Distribuições, já lançadas separadamente). Nenhum valor aqui deve ser uma
        projeção — sempre o número real já publicado pra aquele mês.
      </p>

      <div className="mt-6">
        <FoccusReferencia
          pontos={comparativo.map((p) => ({ mes: p.mes.toISOString().slice(0, 10), foccus: p.foccus }))}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          Lançar / atualizar índice
        </p>
        <BenchmarksForm />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          Índices lançados
        </p>
        <BenchmarksLista itens={benchmarks} />
      </div>
    </div>
  );
}
