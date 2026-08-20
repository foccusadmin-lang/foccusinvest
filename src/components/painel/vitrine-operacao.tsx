"use client";

import { useId, useState } from "react";

export type PontoComparativo = { data: string; acumulado: number };

export type VitrineOperacaoProps = {
  nome: string;
  moedas: string;
  ativa: boolean;
  esperadoMin: number;
  esperadoMax: number;
  acumulado: number;
  ontem: number;
  serieComparativo: PontoComparativo[];
};

function formatPct(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function formatDataCurta(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

function Sparkline({ pontos }: { pontos: PontoComparativo[] }) {
  const gradientId = useId();
  const W = 560;
  const H = 90;

  if (pontos.length < 2) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <line x1={0} y1={H - 10} x2={W} y2={H - 10} stroke="var(--color-border)" strokeWidth={1} />
      </svg>
    );
  }

  const valores = pontos.map((p) => p.acumulado);
  const min = Math.min(...valores, 0);
  const max = Math.max(...valores, 0.01);
  const range = max - min || 1;

  const passo = W / (pontos.length - 1);
  const coords = pontos.map((p, i) => {
    const x = i * passo;
    const y = H - 10 - ((p.acumulado - min) / range) * (H - 20);
    return { x, y };
  });

  const linha = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const area = `0,${H} ${linha} ${W},${H}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f2d675" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#f2d675" stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline points={linha} fill="none" stroke="#f2d675" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function ComparativoChart({ pontos }: { pontos: PontoComparativo[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = 260;
  const PAD_L = 32;
  const PAD_R = 12;
  const PAD_T = 16;
  const PAD_B = 28;
  const GRID_STEPS = 4;

  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const valores = pontos.map((p) => p.acumulado);
  const maxBruto = Math.max(...valores, 0.01);
  const max = Math.ceil(maxBruto * 1.15 * 2) / 2 || 1;
  const min = Math.min(0, ...valores);

  const passo = pontos.length > 1 ? plotW / (pontos.length - 1) : 0;
  const coords = pontos.map((p, i) => {
    const x = PAD_L + i * passo;
    const y = PAD_T + plotH - ((p.acumulado - min) / (max - min)) * plotH;
    return { x, y };
  });

  const linha = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const gridValues = Array.from({ length: GRID_STEPS + 1 }, (_, i) => min + ((max - min) / GRID_STEPS) * i);

  // Mostra só um subconjunto de labels no eixo X pra não poluir quando há muitos pontos.
  const maxLabels = 8;
  const passoLabel = Math.max(1, Math.ceil(pontos.length / maxLabels));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Gráfico comparativo da estratégia">
        {gridValues.map((v, i) => {
          const y = PAD_T + plotH - ((v - min) / (max - min)) * plotH;
          return (
            <g key={i}>
              <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="var(--color-border)" strokeWidth={1} />
              <text x={4} y={y + 3} className="fill-muted text-[9px]">
                {v.toFixed(0)}
              </text>
            </g>
          );
        })}

        {pontos.length > 1 && (
          <polyline points={linha} fill="none" stroke="#f2a90e" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        )}

        {coords.map((c, i) => (
          <g key={i}>
            <rect
              x={c.x - passo / 2}
              y={PAD_T}
              width={passo || plotW}
              height={plotH}
              fill="transparent"
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover((cur) => (cur === i ? null : cur))}
              className="cursor-pointer"
            />
            {i % passoLabel === 0 && (
              <text x={c.x} y={H - 8} textAnchor="middle" className="fill-muted text-[9px]">
                {formatDataCurta(pontos[i].data)}
              </text>
            )}
            {hover === i && (
              <>
                <circle cx={c.x} cy={c.y} r={3.5} fill="#f2a90e" />
                <rect
                  x={Math.min(Math.max(c.x - 40, PAD_L), W - PAD_R - 80)}
                  y={Math.max(c.y - 32, 2)}
                  width={80}
                  height={24}
                  rx={5}
                  className="fill-surface-2 stroke-border"
                  strokeWidth={1}
                />
                <text
                  x={Math.min(Math.max(c.x, PAD_L + 40), W - PAD_R - 40)}
                  y={Math.max(c.y - 32, 2) + 16}
                  textAnchor="middle"
                  className="fill-foreground text-[11px] font-semibold"
                >
                  {formatPct(pontos[i].acumulado)}
                </text>
              </>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

export function VitrineOperacao({
  nome,
  moedas,
  ativa,
  esperadoMin,
  esperadoMax,
  acumulado,
  ontem,
  serieComparativo,
}: VitrineOperacaoProps) {
  const inicial = moedas.trim().slice(0, 2).toUpperCase() || "OP";

  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center gap-2">
        {ativa && (
          <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" /> Live
          </span>
        )}
        <h2 className="text-lg font-bold text-foreground">Operações</h2>
      </div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted">— {nome} —</p>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-surface-2 px-4 py-2.5">
        <span className="text-sm font-semibold text-foreground">{nome}</span>
        <span className={`text-sm font-bold ${ontem >= 0 ? "text-emerald-300" : "text-red-300"}`}>
          {formatPct(ontem)}
        </span>
      </div>

      <div className="mt-3 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/15 text-xs font-bold text-gold-light">
              {inicial}
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">{nome}</p>
              <p className="text-xs text-muted">{moedas}</p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Sparkline pontos={serieComparativo} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted">Acumulado</p>
            <p className={`mt-0.5 text-sm font-bold ${acumulado >= 0 ? "text-emerald-300" : "text-red-300"}`}>
              {formatPct(acumulado)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted">Ontem</p>
            <p className={`mt-0.5 text-sm font-bold ${ontem >= 0 ? "text-emerald-300" : "text-red-300"}`}>
              {formatPct(ontem)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted">Esperado</p>
            <p className="mt-0.5 text-sm font-bold text-sky-300">
              {esperadoMin.toFixed(1)}% – {esperadoMax.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
        <p className="text-sm font-semibold text-foreground">Comparativo</p>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted">— {nome} —</p>
        <div className="mt-3">
          {serieComparativo.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted">
              Ainda sem lançamentos — o comparativo aparece aqui assim que a estratégia começar a
              operar.
            </p>
          ) : (
            <ComparativoChart pontos={serieComparativo} />
          )}
        </div>
      </div>
    </div>
  );
}
