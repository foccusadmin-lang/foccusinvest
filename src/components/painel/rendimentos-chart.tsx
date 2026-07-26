"use client";

import { useId, useState } from "react";
import { formatMoeda } from "@/lib/format";

export type PontoRendimento = {
  data: Date;
  valor: number;
};

const WIDTH = 640;
const HEIGHT = 220;
const PADDING_LEFT = 8;
const PADDING_RIGHT = 8;
const PADDING_TOP = 28;
const PADDING_BOTTOM = 28;
const BAR_MAX_THICKNESS = 24;
const GRID_STEPS = 4;

function formatDataCurta(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
}

export function RendimentosChart({
  pontos,
  moeda = "BRL",
}: {
  pontos: PontoRendimento[];
  moeda?: "BRL" | "USD" | "USDT";
}) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const total = pontos.reduce((acc, p) => acc + p.valor, 0);
  const temMovimentacao = total > 0;
  const max = Math.max(...pontos.map((p) => p.valor), 1);

  const plotWidth = WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const slot = plotWidth / pontos.length;
  const barWidth = Math.min(BAR_MAX_THICKNESS, slot * 0.5);

  const gridValues = Array.from({ length: GRID_STEPS + 1 }, (_, i) => (max / GRID_STEPS) * i);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Evolução dos rendimentos
          </h2>
          <p className="text-xs text-muted">Liberações das últimas {pontos.length} sextas-feiras</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-muted">Total no período</p>
          <p className="text-lg font-semibold text-gold-light">
            {formatMoeda(total, moeda)}
          </p>
        </div>
      </div>

      <div className="relative mt-4">
        {!temMovimentacao && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <p className="max-w-[220px] text-center text-xs text-muted">
              Seus rendimentos aparecerão aqui após a primeira liberação de
              sexta-feira.
            </p>
          </div>
        )}

        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className={`w-full ${!temMovimentacao ? "opacity-30" : ""}`}
          role="img"
          aria-label={`Gráfico de rendimentos das últimas ${pontos.length} semanas, total ${formatMoeda(total, moeda)}`}
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

          {pontos.map((p, i) => {
            const cx = PADDING_LEFT + slot * i + slot / 2;
            const barHeight = temMovimentacao ? (p.valor / max) * plotHeight : 0;
            const y = PADDING_TOP + plotHeight - barHeight;
            const isHovered = hoverIndex === i;
            const isLast = i === pontos.length - 1;

            return (
              <g key={i}>
                <rect
                  x={cx - slot / 2}
                  y={PADDING_TOP}
                  width={slot}
                  height={plotHeight}
                  fill="transparent"
                  onPointerEnter={() => setHoverIndex(i)}
                  onPointerLeave={() => setHoverIndex((cur) => (cur === i ? null : cur))}
                  className="cursor-pointer"
                />
                <rect
                  x={cx - barWidth / 2}
                  y={y}
                  width={barWidth}
                  height={Math.max(barHeight, 2)}
                  rx={4}
                  fill={`url(#${gradientId})`}
                  opacity={isHovered ? 1 : 0.85}
                  className="transition-opacity duration-150"
                />
                {isLast && temMovimentacao && (
                  <text
                    x={cx}
                    y={y - 8}
                    textAnchor="middle"
                    className="fill-foreground text-[10px] font-semibold"
                  >
                    {formatMoeda(p.valor, moeda)}
                  </text>
                )}
                <text
                  x={cx}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                  className="fill-muted text-[9px]"
                >
                  {formatDataCurta(p.data)}
                </text>

                {isHovered && (
                  <g>
                    <rect
                      x={Math.min(Math.max(cx - 42, PADDING_LEFT), WIDTH - PADDING_RIGHT - 84)}
                      y={Math.max(y - 34, 2)}
                      width={84}
                      height={26}
                      rx={6}
                      className="fill-surface-2 stroke-border"
                      strokeWidth={1}
                    />
                    <text
                      x={Math.min(Math.max(cx, PADDING_LEFT + 42), WIDTH - PADDING_RIGHT - 42)}
                      y={Math.max(y - 34, 2) + 17}
                      textAnchor="middle"
                      className="fill-foreground text-[11px] font-semibold"
                    >
                      {formatMoeda(p.valor, moeda)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
