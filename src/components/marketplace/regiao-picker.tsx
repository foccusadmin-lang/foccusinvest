"use client";

import { useMemo, useState } from "react";

type RegiaoOpcao = { id: string; nome: string };

/**
 * Seletor de bairro com busca — usado tanto pro cliente escolher "onde precisa" quanto pro
 * prestador escolher onde mora (`multiplo=false`) e onde atende (`multiplo=true`). A lista de
 * bairros vem do servidor (banco), a busca digitada filtra só o que já foi carregado — sem
 * chamar nenhuma API externa (spec "Parte 2", seção 18).
 *
 * Os checkboxes/radios visíveis são só a interação; o que realmente é enviado no formulário são
 * inputs escondidos (um por item selecionado, sempre montados), pra não perder a seleção quando
 * a busca filtra um item que já estava marcado.
 */
export function RegiaoPicker({
  regioes,
  name,
  multiplo = false,
  selecionadasIniciais = [],
}: {
  regioes: RegiaoOpcao[];
  name: string;
  multiplo?: boolean;
  selecionadasIniciais?: string[];
}) {
  const [busca, setBusca] = useState("");
  const [selecionadas, setSelecionadas] = useState<string[]>(selecionadasIniciais);

  const filtradas = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return regioes;
    return regioes.filter((r) => normalizar(r.nome).includes(termo));
  }, [busca, regioes]);

  function alternar(id: string) {
    setSelecionadas((prev) => {
      if (multiplo) {
        return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      }
      return prev.includes(id) ? [] : [id];
    });
  }

  return (
    <div>
      {selecionadas.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      <input
        type="text"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="🔎 Pesquisar bairro"
        className="w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-foreground placeholder:text-muted"
      />

      <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-border">
        {filtradas.length === 0 && (
          <p className="p-4 text-sm text-muted">Nenhum bairro encontrado.</p>
        )}
        {filtradas.map((r) => {
          const marcado = selecionadas.includes(r.id);
          return (
            <label
              key={r.id}
              className="flex cursor-pointer items-center gap-3 border-b border-border px-4 py-3 text-sm text-foreground last:border-b-0 hover:bg-surface-2"
            >
              <input
                type={multiplo ? "checkbox" : "radio"}
                checked={marcado}
                onChange={() => alternar(r.id)}
                className="h-4 w-4 accent-sky-400"
              />
              {r.nome}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
