"use client";

import { useMemo, useState } from "react";
import { formatMoeda } from "@/lib/format";
import { CodigoIndicacaoActions } from "./codigo-actions";
import { IndicadoPorActions } from "./indicado-por-actions";

type Usuario = {
  id: string;
  name: string | null;
  email: string;
  codigoIndicacao: string | null;
  indicadoPor: { name: string | null; email: string; codigoIndicacao: string | null } | null;
  indicados: { id: string }[];
};

export function IndicacoesLista({
  usuarios,
  bonusPorId,
}: {
  usuarios: Usuario[];
  bonusPorId: Map<string, number>;
}) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return usuarios;
    return usuarios.filter(
      (u) =>
        (u.name?.toLowerCase().includes(termo) ?? false) ||
        u.email.toLowerCase().includes(termo) ||
        (u.codigoIndicacao?.toLowerCase().includes(termo) ?? false)
    );
  }, [usuarios, busca]);

  return (
    <>
      <div className="mb-4">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          type="text"
          placeholder="Buscar por nome, e-mail ou código..."
          className="w-full max-w-md rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Indicado por</th>
              <th className="px-4 py-3">Indicados diretos</th>
              <th className="px-4 py-3">Bônus recebido</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtrados.map((u) => (
              <tr key={u.id} className="bg-surface">
                <td className="px-4 py-3 font-medium text-foreground">{u.name ?? u.email}</td>
                <td className="px-4 py-3 font-mono text-xs text-gold-light">
                  {u.codigoIndicacao ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <IndicadoPorActions
                    userId={u.id}
                    indicadoPorAtual={
                      u.indicadoPor
                        ? { nome: u.indicadoPor.name ?? u.indicadoPor.email, codigo: u.indicadoPor.codigoIndicacao }
                        : null
                    }
                  />
                </td>
                <td className="px-4 py-3 text-foreground">{u.indicados.length}</td>
                <td className="px-4 py-3 font-semibold text-fuchsia-300">
                  {formatMoeda(bonusPorId.get(u.id) ?? 0)}
                </td>
                <td className="px-4 py-3">
                  <CodigoIndicacaoActions userId={u.id} codigoAtual={u.codigoIndicacao} />
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
