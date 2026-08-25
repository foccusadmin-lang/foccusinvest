"use client";

import { useMemo, useState } from "react";
import type { CategoriaBem } from "@prisma/client";
import { formatMoeda, formatData } from "@/lib/format";
import { CARENCIA_MESES_PADRAO_BEM, LABEL_CATEGORIA_BEM } from "@/lib/bens";
import { AprovarRejeitarAporte } from "./comprovante-actions";
import { AvaliarAporteBemButton } from "./avaliar-bem-actions";
import { IndicacaoRetroativaButton } from "./indicacao-retroativa-button";
import { LiberarBonusButton } from "./liberar-bonus-button";

export type AportePendente = {
  id: string;
  valor: number;
  criadoEm: Date;
  user: { name: string | null; email: string };
  categoriaBem: CategoriaBem | null;
  descricaoBem: string | null;
  valorDeclarado: number | null;
  dataAgendamento: Date | null;
  aporteDuplicadoDeId: string | null;
};

export type AporteRecente = {
  id: string;
  valor: number;
  status: string;
  motivoRejeicao: string | null;
  aprovadoEm: Date | null;
  user: { name: string | null; email: string };
  aprovadoPor: { name: string | null; email: string } | null;
  temIndicador: boolean;
  bonusJaCreditado: boolean;
  categoriaBem: CategoriaBem | null;
};

function combinaBusca(nome: string | null, email: string, termo: string): boolean {
  return (nome ?? "").toLowerCase().includes(termo) || email.toLowerCase().includes(termo);
}

export function AportesLista({
  pendentes,
  recentes,
}: {
  pendentes: AportePendente[];
  recentes: AporteRecente[];
}) {
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();

  const pendentesFiltrados = useMemo(
    () => (!termo ? pendentes : pendentes.filter((a) => combinaBusca(a.user.name, a.user.email, termo))),
    [pendentes, termo]
  );
  const recentesFiltrados = useMemo(
    () => (!termo ? recentes : recentes.filter((a) => combinaBusca(a.user.name, a.user.email, termo))),
    [recentes, termo]
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
        Comprovantes aguardando conferência
      </p>

      {pendentesFiltrados.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
          Nenhum aporte aguardando aprovação.
        </p>
      ) : (
        <div className="space-y-3">
          {pendentesFiltrados.map((a) =>
            a.categoriaBem ? (
              <div
                key={a.id}
                className="flex flex-col gap-3 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{a.user.name ?? a.user.email}</p>
                    <span className="rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-300">
                      Aporte em {LABEL_CATEGORIA_BEM[a.categoriaBem]}
                    </span>
                  </div>
                  <p className="text-xs text-muted">{a.user.email}</p>
                  <p className="mt-1 text-lg font-bold text-gold-light">
                    {formatMoeda(a.valorDeclarado ?? a.valor)}{" "}
                    <span className="text-xs font-normal text-muted">(valor declarado)</span>
                  </p>
                  {a.descricaoBem && <p className="mt-1 max-w-md text-xs text-muted">{a.descricaoBem}</p>}
                  {a.dataAgendamento && (
                    <p className="mt-1 text-xs text-fuchsia-300">
                      Agendado para {formatData(a.dataAgendamento)} às{" "}
                      {new Date(a.dataAgendamento).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                  <p className="text-xs text-muted">Solicitado em {formatData(a.criadoEm)}</p>
                </div>
                <AvaliarAporteBemButton
                  id={a.id}
                  valorDeclarado={a.valorDeclarado ?? a.valor}
                  mesesPadrao={CARENCIA_MESES_PADRAO_BEM[a.categoriaBem]}
                />
              </div>
            ) : (
              <div
                key={a.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{a.user.name ?? a.user.email}</p>
                    {a.aporteDuplicadoDeId && (
                      <span
                        title={`Mesmo valor e mesmo comprovante do aporte ${a.aporteDuplicadoDeId}`}
                        className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-300"
                      >
                        ‼️ Possível duplicado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted">{a.user.email}</p>
                  <p className="mt-1 text-lg font-bold text-gold-light">{formatMoeda(a.valor)}</p>
                  <p className="text-xs text-muted">Enviado em {formatData(a.criadoEm)}</p>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <a
                    href={`/restrito/aportes/${a.id}/comprovante`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-300 hover:bg-sky-500/25"
                  >
                    Ver comprovante
                  </a>
                  <AprovarRejeitarAporte id={a.id} />
                </div>
              </div>
            )
          )}
        </div>
      )}

      <p className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
        Histórico recente
      </p>

      {recentesFiltrados.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
          Nenhum aporte encontrado.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Investidor</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Processado por</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Comprovante</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentesFiltrados.map((a) => (
                <tr key={a.id} className="bg-surface">
                  <td className="px-4 py-3 text-foreground">{a.user.name ?? a.user.email}</td>
                  <td className="px-4 py-3 font-semibold text-gold-light">
                    {formatMoeda(a.valor)}
                  </td>
                  <td className="px-4 py-3">
                    {a.status === "CONFIRMADA" ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300">
                        Aprovado
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-500/15 px-2 py-1 text-xs font-semibold text-red-300">
                        Rejeitado{a.motivoRejeicao ? `: ${a.motivoRejeicao}` : ""}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {a.aprovadoPor ? a.aprovadoPor.name ?? a.aprovadoPor.email : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {a.aprovadoEm ? formatData(a.aprovadoEm) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {a.categoriaBem ? (
                      <span className="text-xs text-muted">—</span>
                    ) : (
                      <a
                        href={`/restrito/aportes/${a.id}/comprovante`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-300 hover:bg-sky-500/25"
                      >
                        Ver comprovante
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {a.status === "CONFIRMADA" &&
                      (a.temIndicador && !a.bonusJaCreditado ? (
                        <LiberarBonusButton aplicacaoId={a.id} />
                      ) : (
                        <IndicacaoRetroativaButton aplicacaoId={a.id} />
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
