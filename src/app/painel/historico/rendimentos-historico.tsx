"use client";

import { useMemo } from "react";
import { formatMoeda, formatData } from "@/lib/format";
import { useGrupoPorData } from "./use-grupo-data";

type Credito = {
  id: string;
  valor: number;
  origem: string;
  criadoEm: Date;
  utilizadoEm: Date | null;
  solicitacaoSaqueId: string | null;
};

/** Extrai o percentual de um lançamento de "PLR manual 0,13% (admin)" — só esse tipo de
 *  crédito carrega o percentual no próprio texto de origem. */
function extrairPercentual(origem: string): number | null {
  const match = origem.match(/^PLR manual ([\d.,]+)%/);
  if (!match) return null;
  const valor = Number(match[1].replace(",", "."));
  return Number.isNaN(valor) ? null : valor;
}

/** Percentual acumulado de cada crédito dentro do próprio grupo (mês), somando em ordem
 *  cronológica — ex: dia 1 lança 0,13%, dia 2 lança 0,15% (acumulado 0,28%), dia 3 lança
 *  0,5% (acumulado 0,78%). Créditos que não são PLR manual (sem percentual) não somam nada,
 *  mas mantêm o acumulado de quem veio antes. */
function calcularAcumulados(grupoItens: Credito[]): Map<string, number> {
  const ordemCronologica = [...grupoItens].sort(
    (a, b) => a.criadoEm.getTime() - b.criadoEm.getTime()
  );
  const acumulados = new Map<string, number>();
  let soma = 0;
  for (const c of ordemCronologica) {
    const percentual = extrairPercentual(c.origem);
    if (percentual !== null) soma += percentual;
    acumulados.set(c.id, soma);
  }
  return acumulados;
}

export function RendimentosHistorico({
  itens,
  mensagemVazio = "Você ainda não recebeu créditos de PLR/rendimento.",
}: {
  itens: Credito[];
  mensagemVazio?: string;
}) {
  const { grupos, expandidos, toggle } = useGrupoPorData(itens);

  const acumuladosPorGrupo = useMemo(
    () => grupos.map(([data, grupoItens]) => [data, calcularAcumulados(grupoItens)] as const),
    [grupos]
  );

  if (grupos.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
        {mensagemVazio}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {grupos.map(([data, grupoItens], i) => {
        const aberto = expandidos.has(data);
        const total = grupoItens.reduce((acc, c) => acc + c.valor, 0);
        const acumulados = acumuladosPorGrupo[i][1];
        const percentualTotalGrupo = Math.max(0, ...Array.from(acumulados.values()));
        return (
          <div key={data} className="overflow-hidden rounded-2xl border border-border">
            <button
              type="button"
              onClick={() => toggle(data)}
              className="flex w-full items-center justify-between bg-surface-2 px-4 py-3 text-left transition hover:bg-surface-2/70"
            >
              <div>
                <p className="font-semibold text-foreground">{data}</p>
                <p className="text-xs text-muted">
                  {grupoItens.length} crédito(s) · Total {formatMoeda(total)}
                  {percentualTotalGrupo > 0 && (
                    <>
                      {" "}
                      · <span className="text-gold-light">
                        {percentualTotalGrupo.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% acumulado
                      </span>
                    </>
                  )}
                </p>
              </div>
              <span className="text-muted">{aberto ? "▲" : "▼"}</span>
            </button>

            {aberto && (
              <div className="divide-y divide-border">
                {grupoItens.map((c) => {
                  const usado = Boolean(c.utilizadoEm || c.solicitacaoSaqueId);
                  const acumulado = acumulados.get(c.id) ?? 0;
                  return (
                    <div
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-2 bg-surface px-4 py-3"
                    >
                      <div>
                        <p className="font-semibold text-gold-light">{formatMoeda(c.valor)}</p>
                        <p className="text-xs text-muted">
                          {formatData(c.criadoEm)} · {c.origem}
                        </p>
                        {acumulado > 0 && (
                          <p className="text-xs text-emerald-300">
                            Acumulado no mês: {acumulado.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%
                          </p>
                        )}
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          usado ? "bg-white/10 text-muted" : "bg-emerald-500/15 text-emerald-300"
                        }`}
                      >
                        {usado ? "Já usado" : "Disponível"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
