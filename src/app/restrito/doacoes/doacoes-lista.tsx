"use client";

import { useMemo, useState } from "react";
import { formatMoeda, formatData } from "@/lib/format";
import { AprovarRecusarDoacao } from "./aprovar-recusar";

const TIPO_LABEL: Record<string, string> = {
  SALDO_DISPONIVEL: "Doação com saldo",
  NOVA_APLICACAO: "Nova aplicação p/ entidade",
};

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  AGUARDANDO_PAGAMENTO: { label: "Aguardando pagamento", className: "bg-amber-500/15 text-amber-300" },
  EM_PROCESSAMENTO: { label: "Em processamento", className: "bg-sky-500/15 text-sky-300" },
  EM_ANALISE: { label: "Em análise", className: "bg-amber-500/15 text-amber-300" },
  CONFIRMADA: { label: "Confirmada", className: "bg-emerald-500/15 text-emerald-300" },
  CANCELADA: { label: "Cancelada", className: "bg-red-500/15 text-red-300" },
  ESTORNADA: { label: "Estornada", className: "bg-red-500/15 text-red-300" },
};

type Doacao = {
  id: string;
  valorBruto: number;
  status: string;
  tipoDoacao: string;
  doacaoAnonima: boolean;
  motivoRecusa: string | null;
  criadoEm: Date;
  doador: { name: string | null; email: string };
  entidade: { user: { email: string; pessoaJuridica: { nomeFantasia: string | null; razaoSocial: string } | null } };
};

function nomeEntidade(d: Doacao): string {
  return d.entidade.user.pessoaJuridica?.nomeFantasia ?? d.entidade.user.pessoaJuridica?.razaoSocial ?? d.entidade.user.email;
}

export function DoacoesLista({ pendentes, recentes }: { pendentes: Doacao[]; recentes: Doacao[] }) {
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();
  const combina = (d: Doacao) =>
    !termo ||
    (d.doador.name?.toLowerCase().includes(termo) ?? false) ||
    d.doador.email.toLowerCase().includes(termo) ||
    nomeEntidade(d).toLowerCase().includes(termo);

  const pendentesFiltrados = useMemo(() => pendentes.filter(combina), [pendentes, termo]);
  const recentesFiltrados = useMemo(() => recentes.filter(combina), [recentes, termo]);

  return (
    <>
      <div className="mt-4">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          type="text"
          placeholder="Buscar por doador ou entidade..."
          className="w-full max-w-md rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
        />
      </div>

      <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
        Comprovantes aguardando conferência
      </p>

      {pendentesFiltrados.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
          {pendentes.length === 0 ? "Nenhuma doação aguardando aprovação." : "Nenhum resultado pra essa busca."}
        </p>
      ) : (
        <div className="space-y-3">
          {pendentesFiltrados.map((d) => (
            <div
              key={d.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-foreground">
                  {d.doacaoAnonima ? "Doador anônimo" : d.doador.name ?? d.doador.email}
                </p>
                <p className="text-xs text-muted">Para {nomeEntidade(d)}</p>
                <p className="mt-1 text-lg font-bold text-gold-light">{formatMoeda(d.valorBruto)}</p>
                <p className="text-xs text-muted">Enviado em {formatData(d.criadoEm)}</p>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <a
                  href={`/restrito/doacoes/${d.id}/comprovante`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-300 hover:bg-sky-500/25"
                >
                  Ver comprovante
                </a>
                <AprovarRecusarDoacao id={d.id} />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
        Histórico recente
      </p>

      {recentesFiltrados.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
          {recentes.length === 0 ? "Nenhuma doação processada ainda." : "Nenhum resultado pra essa busca."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Doador</th>
                <th className="px-4 py-3">Entidade</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentesFiltrados.map((d) => {
                const status = STATUS_LABEL[d.status] ?? { label: d.status, className: "bg-white/10 text-muted" };
                return (
                  <tr key={d.id} className="bg-surface">
                    <td className="px-4 py-3 text-foreground">
                      {d.doacaoAnonima ? "Anônimo" : d.doador.name ?? d.doador.email}
                    </td>
                    <td className="px-4 py-3 text-muted">{nomeEntidade(d)}</td>
                    <td className="px-4 py-3 text-xs text-muted">{TIPO_LABEL[d.tipoDoacao] ?? d.tipoDoacao}</td>
                    <td className="px-4 py-3 font-semibold text-gold-light">{formatMoeda(d.valorBruto)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${status.className}`}>
                        {status.label}
                      </span>
                      {d.motivoRecusa && <p className="mt-0.5 text-xs text-red-300/90">{d.motivoRecusa}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{formatData(d.criadoEm)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
