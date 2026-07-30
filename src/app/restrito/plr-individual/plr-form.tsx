"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoeda } from "@/lib/format";
import { aplicarPlrIndividual } from "./actions";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  codigo: string;
  capital: number;
};

export function PlrIndividualForm({ usuarios }: { usuarios: Usuario[] }) {
  const [state, action, pending] = useActionState(aplicarPlrIndividual, undefined);
  const [percentualTexto, setPercentualTexto] = useState("0,5");
  const [dataTexto, setDataTexto] = useState(() => new Date().toISOString().slice(0, 10));
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const router = useRouter();
  const processado = useRef(false);

  useEffect(() => {
    if (state?.sucesso && !processado.current) {
      processado.current = true;
      router.refresh();
      setSelecionados(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const percentual = Number(percentualTexto.replace(",", ".")) || 0;

  const elegiveis = useMemo(() => usuarios.filter((u) => u.capital > 0), [usuarios]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return usuarios;
    return usuarios.filter(
      (u) =>
        u.nome.toLowerCase().includes(termo) ||
        u.email.toLowerCase().includes(termo) ||
        u.codigo.toLowerCase().includes(termo)
    );
  }, [usuarios, busca]);

  function alternar(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function selecionarTodosElegiveis() {
    setSelecionados(new Set(elegiveis.map((u) => u.id)));
  }

  function desmarcarTodos() {
    setSelecionados(new Set());
  }

  const totalEstimado = usuarios
    .filter((u) => selecionados.has(u.id))
    .reduce((acc, u) => acc + u.capital * (percentual / 100), 0);

  return (
    <form action={action} className="space-y-4">
      <div className="rounded-2xl border border-gold/30 bg-surface-2 p-4">
        <div className="flex flex-wrap gap-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-foreground/90">Percentual a aplicar (%)</span>
            <input
              name="percentual"
              value={percentualTexto}
              onChange={(e) => setPercentualTexto(e.target.value)}
              type="text"
              inputMode="decimal"
              placeholder="0,5"
              required
              className="w-full max-w-[160px] rounded-lg border border-border bg-surface px-3 py-2 text-foreground outline-none focus:border-gold/60"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-foreground/90">Data do lançamento</span>
            <input
              name="data"
              value={dataTexto}
              onChange={(e) => setDataTexto(e.target.value)}
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              required
              className="w-full max-w-[160px] rounded-lg border border-border bg-surface px-3 py-2 text-foreground outline-none focus:border-gold/60"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-muted">
          Exemplo: capital de {formatMoeda(10000)} × {percentualTexto || "0"}% ={" "}
          <span className="font-semibold text-gold-light">
            {formatMoeda(10000 * (percentual / 100))}
          </span>
        </p>
        <p className="mt-1 text-xs text-muted">
          Use uma data passada pra lançar um dia que ficou pra trás (ex: esqueceu ontem).
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          type="text"
          placeholder="Buscar por nome, e-mail ou código..."
          className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selecionarTodosElegiveis}
            className="whitespace-nowrap rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
          >
            Selecionar elegíveis ({elegiveis.length})
          </button>
          <button
            type="button"
            onClick={desmarcarTodos}
            className="whitespace-nowrap rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-muted hover:bg-white/15"
          >
            Desmarcar todos
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-200">
        <strong>{selecionados.size}</strong> usuário(s) selecionado(s) · PLR estimado total:{" "}
        <strong>{formatMoeda(totalEstimado)}</strong>
      </div>

      <div className="max-h-[360px] overflow-y-auto rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-surface-2 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-3 py-2" />
              <th className="px-3 py-2">Usuário</th>
              <th className="px-3 py-2">Capital</th>
              <th className="px-3 py-2">PLR estimado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtrados.map((u) => {
              const marcado = selecionados.has(u.id);
              const estimado = u.capital * (percentual / 100);
              return (
                <tr
                  key={u.id}
                  className={`cursor-pointer bg-surface ${marcado ? "bg-gold/5" : ""}`}
                  onClick={() => alternar(u.id)}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() => alternar(u.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="accent-gold"
                    />
                    {marcado && <input type="hidden" name="userIds" value={u.id} />}
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-foreground">{u.nome}</p>
                    <p className="text-xs text-muted">
                      {u.email} · {u.codigo}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-emerald-300">{formatMoeda(u.capital)}</td>
                  <td className="px-3 py-2 font-semibold text-gold-light">
                    {u.capital > 0 ? formatMoeda(estimado) : "—"}
                  </td>
                </tr>
              );
            })}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-sm text-muted">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-foreground/90">Observação (opcional)</span>
        <input
          name="observacao"
          type="text"
          placeholder="Ex: bônus julho/2026, correção de bug do dia 20..."
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
        />
      </label>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state?.sucesso && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          {state.sucesso}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || selecionados.size === 0}
        className="w-full rounded-xl bg-gradient-to-br from-[#f2d675] via-[#d4af37] to-[#93731f] py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50 sm:w-auto sm:px-8"
      >
        {pending
          ? "Processando..."
          : `Aplicar PLR aos selecionados (${selecionados.size})`}
      </button>
    </form>
  );
}
