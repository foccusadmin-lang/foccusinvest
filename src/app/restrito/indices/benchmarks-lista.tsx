"use client";

import { useTransition } from "react";
import { excluirBenchmarkAction } from "./actions";
import { LABEL_INDICADOR } from "@/lib/indices-mercado-catalogo";
import type { IndicadorMercado } from "@prisma/client";

type Item = {
  id: string;
  indicador: IndicadorMercado;
  mes: Date;
  valorPercentual: number;
  criadoPor: { name: string | null; email: string };
  atualizadoEm: Date;
};

function formatMes(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(data);
}

export function BenchmarksLista({ itens }: { itens: Item[] }) {
  const [pending, startTransition] = useTransition();

  if (itens.length === 0) {
    return <p className="text-sm text-muted">Nenhum índice lançado ainda.</p>;
  }

  return (
    <div className="max-h-96 space-y-1 overflow-y-auto">
      {itens.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-surface-2 px-3 py-2 text-sm"
        >
          <span className="w-20 shrink-0 font-semibold text-foreground">{LABEL_INDICADOR[item.indicador]}</span>
          <span className="flex-1 text-muted capitalize">{formatMes(item.mes)}</span>
          <span className="font-semibold text-gold-light">{item.valorPercentual.toFixed(2)}%</span>
          <span className="hidden text-xs text-muted sm:inline">
            {item.criadoPor.name ?? item.criadoPor.email}
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => excluirBenchmarkAction(item.id))}
            className="shrink-0 rounded-lg border border-border/60 px-2 py-0.5 text-xs text-muted hover:border-red-500/40 hover:text-red-300 disabled:opacity-50"
          >
            Excluir
          </button>
        </div>
      ))}
    </div>
  );
}
