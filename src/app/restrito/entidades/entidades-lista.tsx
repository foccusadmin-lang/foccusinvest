"use client";

import { useMemo, useState } from "react";
import { formatMoeda } from "@/lib/format";
import { formatCNPJ } from "@/lib/cpf-cnpj";
import { EntidadeLinhaAcoes } from "./linha-acoes";

const TIPO_LABEL: Record<string, string> = {
  IGREJA: "Igreja",
  ONG: "ONG",
  ASSOCIACAO: "Associação",
  INSTITUTO: "Instituto",
  PROJETO_SOCIAL: "Projeto social",
  OUTRO: "Outro",
};

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  CADASTRO_INCOMPLETO: { label: "Cadastro incompleto", className: "bg-white/10 text-muted" },
  AGUARDANDO_DOCUMENTOS: { label: "Aguardando documentos", className: "bg-amber-500/15 text-amber-300" },
  EM_ANALISE: { label: "Em análise", className: "bg-sky-500/15 text-sky-300" },
  AGUARDANDO_SALDO_ATIVACAO: { label: "Aguardando saldo", className: "bg-amber-500/15 text-amber-300" },
  APROVADA: { label: "Aprovada", className: "bg-sky-500/15 text-sky-300" },
  ATIVA: { label: "Ativa", className: "bg-emerald-500/15 text-emerald-300" },
  BLOQUEADA: { label: "Bloqueada", className: "bg-red-500/15 text-red-300" },
  SUSPENSA: { label: "Suspensa", className: "bg-red-500/15 text-red-300" },
  INATIVA: { label: "Inativa", className: "bg-white/10 text-muted" },
};

export type EntidadeLinha = {
  id: string;
  nome: string;
  email: string;
  tipoEntidade: string;
  cnpj: string | null;
  saldoAtual: number;
  taxaAtivacao: number;
  status: string;
  documentosAprovados: boolean;
  termosAceitos: boolean;
  chavePix: string | null;
  pendencias: string[];
};

export function EntidadesLista({ entidades }: { entidades: EntidadeLinha[] }) {
  const [busca, setBusca] = useState("");

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return entidades;
    return entidades.filter(
      (e) =>
        e.nome.toLowerCase().includes(termo) ||
        e.email.toLowerCase().includes(termo) ||
        (e.cnpj?.includes(termo) ?? false)
    );
  }, [entidades, busca]);

  return (
    <>
      <div className="mb-4">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          type="text"
          placeholder="Buscar por nome, e-mail ou CNPJ..."
          className="w-full max-w-md rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Entidade</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">CNPJ</th>
              <th className="px-4 py-3">Saldo</th>
              <th className="px-4 py-3">Taxa ativação</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtradas.map((e) => {
              const status = STATUS_LABEL[e.status] ?? { label: e.status, className: "bg-white/10 text-muted" };
              return (
                <tr key={e.id} className="bg-surface align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{e.nome}</p>
                    <p className="text-xs text-muted">{e.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">{TIPO_LABEL[e.tipoEntidade] ?? e.tipoEntidade}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {e.cnpj ? formatCNPJ(e.cnpj) : "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-300">{formatMoeda(e.saldoAtual)}</td>
                  <td className="px-4 py-3 text-muted">{formatMoeda(e.taxaAtivacao)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <EntidadeLinhaAcoes
                      entidade={{
                        id: e.id,
                        nome: e.nome,
                        status: e.status,
                        documentosAprovados: e.documentosAprovados,
                        termosAceitos: e.termosAceitos,
                        taxaAtivacao: e.taxaAtivacao,
                        chavePix: e.chavePix,
                      }}
                      pendencias={e.pendencias}
                    />
                  </td>
                </tr>
              );
            })}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  {entidades.length === 0 ? "Nenhuma entidade cadastrada ainda." : "Nenhum resultado pra essa busca."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
