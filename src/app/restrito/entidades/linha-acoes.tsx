"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  marcarDocumentosAprovados,
  marcarTermosAceitos,
  definirTaxaAtivacao,
  ativarEntidadeAction,
  alterarStatusEntidade,
} from "./actions";

type Entidade = {
  id: string;
  nome: string;
  status: string;
  documentosAprovados: boolean;
  termosAceitos: boolean;
  taxaAtivacao: number;
  chavePix: string | null;
};

export function EntidadeLinhaAcoes({
  entidade,
  pendencias,
}: {
  entidade: Entidade;
  pendencias: string[];
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-lg bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/25"
      >
        Gerenciar
      </button>
      {aberto && (
        <GerenciarModal entidade={entidade} pendencias={pendencias} onClose={() => setAberto(false)} />
      )}
    </>
  );
}

function GerenciarModal({
  entidade,
  pendencias,
  onClose,
}: {
  entidade: Entidade;
  pendencias: string[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [documentosAprovados, setDocumentosAprovados] = useState(entidade.documentosAprovados);
  const [termosAceitos, setTermosAceitos] = useState(entidade.termosAceitos);
  const [taxa, setTaxa] = useState(entidade.taxaAtivacao.toString());
  const router = useRouter();

  const elegivel = pendencias.length === 0;
  const jaAtiva = entidade.status === "ATIVA";

  function rodar(fn: () => Promise<void>) {
    setErro(null);
    setSucesso(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setErro((e as Error).message);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-foreground">{entidade.nome}</h3>
        <p className="mt-1 text-xs text-muted">Status atual: {entidade.status}</p>

        <div className="mt-4 space-y-2">
          <label className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={documentosAprovados}
              onChange={(e) => {
                const valor = e.target.checked;
                setDocumentosAprovados(valor);
                rodar(async () => {
                  await marcarDocumentosAprovados(entidade.id, valor);
                });
              }}
              className="accent-gold"
            />
            Documentos aprovados
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={termosAceitos}
              onChange={(e) => {
                const valor = e.target.checked;
                setTermosAceitos(valor);
                rodar(async () => {
                  await marcarTermosAceitos(entidade.id, valor);
                });
              }}
              className="accent-gold"
            />
            Termos e contrato aceitos pela entidade
          </label>
        </div>

        <label className="mt-3 block text-sm">
          <span className="mb-1 block font-medium text-foreground/90">Taxa de ativação (R$)</span>
          <div className="flex gap-2">
            <input
              value={taxa}
              onChange={(e) => setTaxa(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
            />
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                rodar(async () => {
                  const numero = Number(taxa.replace(",", "."));
                  await definirTaxaAtivacao(entidade.id, numero);
                })
              }
              className="shrink-0 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-foreground hover:bg-white/15"
            >
              Salvar
            </button>
          </div>
        </label>

        {!elegivel && !jaAtiva && (
          <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            <p className="font-semibold">Pendências pra ativar:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {pendencias.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        {erro && <p className="mt-3 text-sm text-red-400">{erro}</p>}
        {sucesso && <p className="mt-3 text-sm text-emerald-300">{sucesso}</p>}

        <div className="mt-4 space-y-2">
          {!jaAtiva && (
            <button
              type="button"
              disabled={isPending || !elegivel}
              onClick={() =>
                rodar(async () => {
                  const resultado = await ativarEntidadeAction(entidade.id);
                  if (resultado?.error) throw new Error(resultado.error);
                  setSucesso(resultado?.sucesso ?? "Entidade ativada.");
                })
              }
              className="w-full rounded-xl bg-emerald-500/90 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ATIVAR ENTIDADE
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            {jaAtiva ? (
              <>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => rodar(() => alterarStatusEntidade(entidade.id, "BLOQUEADA"))}
                  className="rounded-lg bg-red-500/15 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/25"
                >
                  Bloquear
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => rodar(() => alterarStatusEntidade(entidade.id, "SUSPENSA"))}
                  className="rounded-lg bg-amber-500/15 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/25"
                >
                  Suspender
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => rodar(() => alterarStatusEntidade(entidade.id, "INATIVA"))}
                  className="col-span-2 rounded-lg bg-white/10 py-2 text-xs font-semibold text-muted hover:bg-white/15"
                >
                  Inativar
                </button>
              </>
            ) : (
              ["BLOQUEADA", "SUSPENSA", "INATIVA"].includes(entidade.status) && (
                <button
                  type="button"
                  disabled={isPending || !elegivel}
                  onClick={() => rodar(() => alterarStatusEntidade(entidade.id, "ATIVA"))}
                  className="col-span-2 rounded-lg bg-emerald-500/15 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-40"
                >
                  Reativar
                </button>
              )
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl border border-border/60 py-2.5 text-sm font-semibold text-muted hover:text-foreground"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
