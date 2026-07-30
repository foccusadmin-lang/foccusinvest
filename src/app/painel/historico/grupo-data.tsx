"use client";

import { useMemo, useState, type ReactNode } from "react";
import { formatData } from "@/lib/format";

export function GrupoPorData<T extends { id: string; criadoEm: Date }>({
  itens,
  renderItem,
  renderResumo,
  vazio,
}: {
  itens: T[];
  renderItem: (item: T) => ReactNode;
  renderResumo: (itens: T[]) => ReactNode;
  vazio: string;
}) {
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const grupos = useMemo(() => {
    const mapa = new Map<string, T[]>();
    for (const item of itens) {
      const chave = formatData(item.criadoEm);
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave)!.push(item);
    }
    return Array.from(mapa.entries());
  }, [itens]);

  function toggle(chave: string) {
    setExpandidos((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  if (grupos.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
        {vazio}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {grupos.map(([data, grupoItens]) => {
        const aberto = expandidos.has(data);
        return (
          <div key={data} className="overflow-hidden rounded-2xl border border-border">
            <button
              type="button"
              onClick={() => toggle(data)}
              className="flex w-full items-center justify-between bg-surface-2 px-4 py-3 text-left transition hover:bg-surface-2/70"
            >
              <div>
                <p className="font-semibold text-foreground">{data}</p>
                <div className="text-xs text-muted">{renderResumo(grupoItens)}</div>
              </div>
              <span className="text-muted">{aberto ? "▲" : "▼"}</span>
            </button>
            {aberto && (
              <div className="divide-y divide-border">
                {grupoItens.map((item) => (
                  <div key={item.id} className="bg-surface px-4 py-3">
                    {renderItem(item)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
