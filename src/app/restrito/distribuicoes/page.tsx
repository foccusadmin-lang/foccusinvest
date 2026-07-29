import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda, formatData } from "@/lib/format";
import { DistribuicaoForm } from "./distribuicao-form";
import { ExcluirDistribuicaoButton } from "./excluir-distribuicao-button";

function diasEntre(inicio: Date, fim: Date): number {
  return Math.floor((fim.getTime() - inicio.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}

export default async function RestritoDistribuicoesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const distribuicoes = await prisma.distribuicaoMensal.findMany({
    include: { participantes: true, criadoPor: { select: { name: true, email: true } } },
    orderBy: { criadoEm: "desc" },
  });

  const agora = new Date();

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Distribuições</h1>
      <p className="mt-1 text-sm text-muted">
        Lance um resultado real do período — o pagamento é diluído e liberado automaticamente
        dia a dia para cada investidor, proporcional ao capital de cada um.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <DistribuicaoForm />
      </div>

      <p className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
        Histórico
      </p>

      {distribuicoes.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
          Nenhuma distribuição lançada ainda.
        </p>
      ) : (
        <div className="space-y-3">
          {distribuicoes.map((d) => {
            const diasTotais = diasEntre(d.periodoInicio, d.periodoFim);
            const diasDecorridos = Math.min(
              Math.max(diasEntre(d.periodoInicio, agora), 0),
              diasTotais
            );
            const progresso = Math.round((diasDecorridos / diasTotais) * 100);

            return (
              <div key={d.id} className="rounded-2xl border border-border bg-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">
                      {formatData(d.periodoInicio)} — {formatData(d.periodoFim)}
                    </p>
                    <p className="text-xs text-muted">
                      {d.participantes.length} investidor(es) elegível(is) · lançado por{" "}
                      {d.criadoPor.name ?? d.criadoPor.email}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gold-light">
                      {d.percentual}%
                    </p>
                    <p className="text-xs text-muted">
                      {formatMoeda(d.valorTotal, d.moeda as "BRL")} no total
                    </p>
                    <div className="mt-2">
                      <ExcluirDistribuicaoButton distribuicaoId={d.id} />
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-sm text-foreground/90">{d.resultadoApurado}</p>
                {d.observacoes && (
                  <p className="mt-1 text-xs text-muted">{d.observacoes}</p>
                )}

                <div className="mt-4">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#f2d675] to-[#93731f]"
                      style={{ width: `${progresso}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {diasDecorridos} de {diasTotais} dias pagos ({progresso}%)
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
