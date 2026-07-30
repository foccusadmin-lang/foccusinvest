"use client";

import { useMemo, useState } from "react";
import { formatData } from "@/lib/format";

export function useGrupoPorData<T extends { criadoEm: Date }>(itens: T[]) {
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

  return { grupos, expandidos, toggle };
}
