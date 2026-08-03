"use client";

import { useMemo, useState } from "react";

/** "Julho de 2026" — capitaliza a primeira letra do mês. */
function formatMesAno(data: Date): string {
  const texto = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(data);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Agrupa por mês (em vez de por dia) pra facilitar a conferência de um período maior de uma
 *  vez só. Assume que `itens` já vem ordenado do mais recente pro mais antigo. */
export function useGrupoPorData<T extends { criadoEm: Date }>(itens: T[]) {
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const grupos = useMemo(() => {
    const mapa = new Map<string, T[]>();
    for (const item of itens) {
      const chave = formatMesAno(item.criadoEm);
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
