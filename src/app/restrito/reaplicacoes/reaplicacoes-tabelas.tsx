"use client";

import { useMemo, useState } from "react";
import { formatMoeda, formatData } from "@/lib/format";

export type ResumoInvestidor = {
  userId: string;
  nome: string;
  email: string;
  totalReaplicado: number;
  quantidade: number;
  rendimentoDisponivel: number;
  capitalAtual: number;
};

export type ReaplicacaoLinha = {
  id: string;
  valor: number;
  moeda: string;
  criadoEm: Date;
  user: { name: string | null; email: string };
};

export function ReaplicacoesTabelas({
  resumoPorUsuario,
  reaplicacoes,
}: {
  resumoPorUsuario: ResumoInvestidor[];
  reaplicacoes: ReaplicacaoLinha[];
}) {
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();

  const resumoFiltrado = useMemo(
    () =>
      !termo
        ? resumoPorUsuario
        : resumoPorUsuario.filter(
            (u) => u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo)
          ),
    [resumoPorUsuario, termo]
  );

  const reaplicacoesFiltradas = useMemo(
    () =>
      !termo
        ? reaplicacoes
        : reaplicacoes.filter(
            (r) =>
              (r.user.name ?? "").toLowerCase().includes(termo) ||
              r.user.email.toLowerCase().includes(termo)
          ),
    [reaplicacoes, termo]
  );

  return (
    <>
      <div className="mt-4">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          type="text"
          placeholder="Buscar por nome ou e-mail do investidor..."
          className="w-full max-w-md rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
        />
      </div>

      <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
        Por investidor
      </p>
      {resumoFiltrado.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
          Nenhum investidor encontrado.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Investidor</th>
                <th className="px-4 py-3">Total reaplicado</th>
                <th className="px-4 py-3">Rend. disponível (sobrou)</th>
                <th className="px-4 py-3">Capital atual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {resumoFiltrado.map((u) => (
                <tr key={u.userId} className="bg-surface">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{u.nome}</p>
                    <p className="text-xs text-muted">
                      {u.email} · {u.quantidade}x
                    </p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gold-light">
                    {formatMoeda(u.totalReaplicado)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-300">
                    {formatMoeda(u.rendimentoDisponivel)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">
                    {formatMoeda(u.capitalAtual)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
        Cada reaplicação
      </p>
      {reaplicacoesFiltradas.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
          Nenhuma reaplicação encontrada.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Investidor</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reaplicacoesFiltradas.map((r) => (
                <tr key={r.id} className="bg-surface">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{r.user.name ?? "—"}</p>
                    <p className="text-xs text-muted">{r.user.email}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gold-light">
                    {formatMoeda(r.valor, r.moeda as "BRL")}
                  </td>
                  <td className="px-4 py-3 text-muted">{formatData(r.criadoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
