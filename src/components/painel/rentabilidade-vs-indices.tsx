"use client";

import { useId, useState } from "react";
import {
  LABEL_INDICADOR as LABEL,
  COR_INDICADOR as COR,
  INDICADORES_MERCADO as ORDEM,
} from "@/lib/indices-mercado-catalogo";

export type IndicadorMercadoClient = "CDI" | "CDB" | "IPCA" | "IBOVESPA";

export type PontoComparativoClient = {
  /** Primeiro dia do mês, em ISO (ex: "2026-08-01"). */
  mes: string;
  /** Rentabilidade da Foccus nesse mês — null se não há dado nenhum (nem real, nem histórico
   *  manual). */
  foccus: number | null;
  /** "distribuicao": dado real (Distribuições já lançadas) — sempre tem prioridade. "manual":
   *  histórico lançado à mão pelo admin (só existe pra meses sem nenhuma Distribuição real,
   *  ex: período anterior ao rastreamento automático). null: sem dado. */
  foccusOrigem?: "distribuicao" | "manual" | null;
  valores: Partial<Record<IndicadorMercadoClient, number>>;
};

const WIDTH = 640;
const HEIGHT = 260;
const PADDING_LEFT = 8;
const PADDING_RIGHT = 8;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 28;
const GRID_STEPS = 4;

function formatMesCurto(iso: string): string {
  const [ano, mes] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(ano, mes - 1, 1)))
    .replace(".", "");
}

export function RentabilidadeVsIndices({ pontos }: { pontos: PontoComparativoClient[] }) {
  const gradientId = useId();
  const [hover, setHover] = useState<{ mesIndex: number; serie: string } | null>(null);

  const temAlgumDado = pontos.some((p) => p.foccus !== null || Object.keys(p.valores).length > 0);

  const todasSeries = [
    { chave: "FOCCUS", label: "Foccus Invest", cor: `url(#${gradientId})` },
    ...ORDEM.map((c) => ({ chave: c, label: LABEL[c], cor: COR[c] })),
  ];

  const todosValores = pontos.flatMap((p) => [
    ...(p.foccus !== null ? [p.foccus] : []),
    ...Object.values(p.valores).filter((v): v is number => v !== undefined),
  ]);
  const max = Math.max(...todosValores, 1);

  const plotWidth = WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const slot = plotWidth / pontos.length;
  const seriesPorMes = 5;
  const barWidth = Math.min(10, (slot * 0.8) / seriesPorMes);
  const gapEntreBarras = 2;

  const gridValues = Array.from({ length: GRID_STEPS + 1 }, (_, i) => (max / GRID_STEPS) * i);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Rentabilidade vs Índices</h2>
          <p className="text-xs text-muted">
            Rentabilidade já distribuída, mês a mês, comparada aos principais índices de mercado
          </p>
        </div>
      </div>

      <div className="relative mt-4">
        {!temAlgumDado && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <p className="max-w-[260px] text-center text-xs text-muted">
              Esse comparativo aparece aqui assim que houver distribuições lançadas e índices de
              mercado cadastrados pela administração.
            </p>
          </div>
        )}

        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className={`w-full ${!temAlgumDado ? "opacity-30" : ""}`}
          role="img"
          aria-label="Gráfico comparando a rentabilidade distribuída pela Foccus Invest com CDI, CDB, IPCA e Ibovespa, mês a mês"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f2d675" />
              <stop offset="100%" stopColor="#93731f" />
            </linearGradient>
          </defs>

          {gridValues.map((v, i) => {
            const y = PADDING_TOP + plotHeight - (v / max) * plotHeight;
            return (
              <line
                key={i}
                x1={PADDING_LEFT}
                x2={WIDTH - PADDING_RIGHT}
                y1={y}
                y2={y}
                stroke="var(--color-border)"
                strokeWidth={1}
              />
            );
          })}

          {pontos.map((ponto, mesIndex) => {
            const cx = PADDING_LEFT + slot * mesIndex + slot / 2;

            const valoresDoMes: { chave: string; valor: number | null; cor: string; historico?: boolean }[] = [
              {
                chave: "FOCCUS",
                valor: ponto.foccus,
                cor: `url(#${gradientId})`,
                historico: ponto.foccusOrigem === "manual",
              },
              ...ORDEM.map((c) => ({ chave: c, valor: ponto.valores[c] ?? null, cor: COR[c] })),
            ];
            // Só as séries que de fato têm dado nesse mês — centraliza o grupo com base na
            // quantidade real de barras, em vez de sempre reservar espaço pras 5 séries (isso
            // deixava o grupo inteiro desalinhado do "tick" do mês sempre que uma série faltava,
            // ex: Foccus sem Distribuição lançada ainda).
            const seriesComDado = valoresDoMes.filter((s) => s.valor !== null);
            const larguraGrupoReal =
              seriesComDado.length * barWidth + Math.max(seriesComDado.length - 1, 0) * gapEntreBarras;
            const inicioGrupo = cx - larguraGrupoReal / 2;

            return (
              <g key={ponto.mes}>
                {seriesComDado.map((serie, i) => {
                  const barHeight = (serie.valor! / max) * plotHeight;
                  const x = inicioGrupo + i * (barWidth + gapEntreBarras);
                  const y = PADDING_TOP + plotHeight - barHeight;
                  const isHovered = hover?.mesIndex === mesIndex && hover.serie === serie.chave;

                  return (
                    <rect
                      key={serie.chave}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(barHeight, 2)}
                      rx={2}
                      fill={serie.cor}
                      // Foccus com dado histórico manual (sem Distribuição real ainda pra esse
                      // mês) fica mais translúcida — diferencia visualmente de um mês com dado
                      // real, sem precisar de outra cor.
                      opacity={isHovered ? 1 : serie.historico ? 0.45 : 0.9}
                      strokeDasharray={serie.historico ? "2 1.5" : undefined}
                      stroke={serie.historico ? "#f2d675" : undefined}
                      strokeWidth={serie.historico ? 1 : undefined}
                      onPointerEnter={() => setHover({ mesIndex, serie: serie.chave })}
                      onPointerLeave={() => setHover((cur) => (cur?.mesIndex === mesIndex && cur.serie === serie.chave ? null : cur))}
                      className="cursor-pointer transition-opacity duration-150"
                    />
                  );
                })}

                {hover?.mesIndex === mesIndex && (
                  <text
                    x={cx}
                    y={PADDING_TOP - 6}
                    textAnchor="middle"
                    className="fill-foreground text-[10px] font-semibold"
                  >
                    {(() => {
                      const s = valoresDoMes.find((v) => v.chave === hover.serie);
                      if (s?.valor === null || s?.valor === undefined) return "";
                      return `${s.valor.toFixed(2)}%${s.historico ? " (histórico)" : ""}`;
                    })()}
                  </text>
                )}

                <text x={cx} y={HEIGHT - 10} textAnchor="middle" className="fill-muted text-[9px] capitalize">
                  {formatMesCurto(ponto.mes)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px]">
        {todasSeries.map((s) => (
          <span key={s.chave} className="flex items-center gap-1.5 text-muted">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: s.chave === "FOCCUS" ? "linear-gradient(180deg, #f2d675, #93731f)" : s.cor }}
            />
            {s.label}
          </span>
        ))}
      </div>

      <p className="mt-4 rounded-xl border border-border/70 bg-surface-2 p-3 text-[11px] leading-relaxed text-muted">
        Comparativo apenas informativo. Os valores da Foccus Invest são a rentabilidade
        efetivamente distribuída em cada mês; a barra dourada mais translúcida (contorno
        tracejado) indica um mês sem Distribuição lançada ainda, preenchido com histórico
        cadastrado manualmente pela administração (ex: período anterior ao início do
        rastreamento automático). Os índices de mercado são inseridos manualmente pela
        administração e podem não refletir cotações em tempo real. Rentabilidade passada não
        garante rentabilidade futura.
      </p>
    </div>
  );
}
