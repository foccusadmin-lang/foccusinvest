"use client";

import { useMemo, useState } from "react";
import { formatMoeda, formatData } from "@/lib/format";
import { maskCPF, maskCNPJ } from "@/lib/cpf-cnpj";
import { CancelarMigracaoButton } from "./cancelar-button";
import { AprovarRejeitarButtons } from "./aprovar-buttons";
import { ManualForm } from "./manual-form";

function maskDocumento(documento: string | null): string {
  if (!documento) return "—";
  return documento.length === 14 ? maskCNPJ(documento) : maskCPF(documento);
}

type Migracao = {
  id: string;
  nomeReferencia: string;
  emailReferencia: string | null;
  documento: string | null;
  valor: number;
  valorPlr: number;
  valorBonus: number;
  status: string;
  observacao: string | null;
  criadoEm: Date;
  user: { name: string | null; email: string } | null;
};

export function MigracoesLista({ migracoes }: { migracoes: Migracao[] }) {
  const [busca, setBusca] = useState("");

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return migracoes;
    return migracoes.filter(
      (m) =>
        m.nomeReferencia.toLowerCase().includes(termo) ||
        m.emailReferencia?.toLowerCase().includes(termo) ||
        m.documento?.includes(termo) ||
        m.user?.name?.toLowerCase().includes(termo) ||
        m.user?.email.toLowerCase().includes(termo)
    );
  }, [migracoes, busca]);

  return (
    <>
      <div className="mb-4">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          type="text"
          placeholder="Buscar por nome, e-mail ou documento..."
          className="w-full max-w-md rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Nome (planilha)</th>
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">Capital</th>
              <th className="px-4 py-3">PLR</th>
              <th className="px-4 py-3">Bônus</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Conta vinculada</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtradas.map((m) => (
              <tr key={m.id} className="bg-surface align-top">
                <td className="px-4 py-3 text-foreground">
                  {m.nomeReferencia}
                  {m.emailReferencia && (
                    <p className="mt-0.5 text-[11px] text-muted">{m.emailReferencia}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">{maskDocumento(m.documento)}</td>
                <td className="px-4 py-3 font-semibold text-gold-light">{formatMoeda(m.valor)}</td>
                <td className="px-4 py-3 font-semibold text-emerald-300">
                  {m.valorPlr > 0 ? formatMoeda(m.valorPlr) : "—"}
                </td>
                <td className="px-4 py-3 font-semibold text-fuchsia-300">
                  {m.valorBonus > 0 ? formatMoeda(m.valorBonus) : "—"}
                </td>
                <td className="px-4 py-3">
                  {m.status === "APLICADA" && (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300">
                      Aplicada
                    </span>
                  )}
                  {m.status === "PENDENTE" && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-1 text-xs font-semibold text-amber-300">
                      Aguardando cadastro
                    </span>
                  )}
                  {m.status === "SEM_DOCUMENTO" && (
                    <span className="rounded-full bg-red-500/15 px-2 py-1 text-xs font-semibold text-red-300">
                      Sem CPF/CNPJ
                    </span>
                  )}
                  {m.status === "AGUARDANDO_APROVACAO" && (
                    <span className="rounded-full bg-sky-500/15 px-2 py-1 text-xs font-semibold text-sky-300">
                      Aguardando aprovação
                    </span>
                  )}
                  {m.observacao && (
                    <p className="mt-1 max-w-[220px] text-[11px] leading-tight text-amber-300/90">
                      {m.observacao}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {m.user ? m.user.name ?? m.user.email : "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs text-muted">
                  {formatData(m.criadoEm)}
                </td>
                <td className="px-4 py-3 text-right">
                  {m.status === "AGUARDANDO_APROVACAO" && <AprovarRejeitarButtons id={m.id} />}
                  {m.status === "PENDENTE" && <CancelarMigracaoButton id={m.id} />}
                  {m.status === "SEM_DOCUMENTO" && (
                    <ManualForm migracaoId={m.id} emailSugerido={m.emailReferencia} />
                  )}
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-sm text-muted">
                  Nenhum lançamento encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
