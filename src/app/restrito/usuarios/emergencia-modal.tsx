"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatData, formatMoeda } from "@/lib/format";
import { MoneyInput } from "@/components/ui/money-input";
import { IconAlert } from "@/components/icons";
import { liberarEmergenciaAction, cancelarLiberacaoEmergenciaAction } from "./emergencia-actions";

export type AplicacaoElegivel = {
  id: string;
  valor: number;
  criadoEm: string;
  liberaEm: string;
  emCarencia: boolean;
};

export type LiberacaoAtivaResumo = {
  id: string;
  aplicacaoId: string;
  valorMaximo: number;
  tipoSaque: "TOTAL" | "PARCIAL";
  motivo: string;
  expiraEm: string;
};

type Usuario = {
  id: string;
  nome: string;
  email: string;
  capitalDisponivel: number;
  capitalCarencia: number;
  rendimento: number;
  aplicacoes: AplicacaoElegivel[];
  liberacaoAtiva: LiberacaoAtivaResumo | null;
};

export function LiberarEmergenciaButton({ usuario }: { usuario: Usuario }) {
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (usuario.liberacaoAtiva) {
    const l = usuario.liberacaoAtiva;
    return (
      <button
        disabled={isPending}
        title={`Aplicação liberada até ${formatData(new Date(l.expiraEm))} · máx. ${formatMoeda(l.valorMaximo)} · ${l.motivo}\nClique pra cancelar`}
        onClick={() =>
          startTransition(async () => {
            await cancelarLiberacaoEmergenciaAction(l.id);
            router.refresh();
          })
        }
        className="rounded-lg bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-50"
      >
        Emergência liberada
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        disabled={usuario.aplicacoes.length === 0}
        title={
          usuario.aplicacoes.length === 0
            ? "Esse investidor não tem nenhuma aplicação disponível pra liberar"
            : "Liberar saque de emergência"
        }
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/15 text-red-300 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <IconAlert width={14} height={14} />
      </button>
      {aberto && <LiberarEmergenciaModal usuario={usuario} onClose={() => setAberto(false)} />}
    </>
  );
}

function LiberarEmergenciaModal({ usuario, onClose }: { usuario: Usuario; onClose: () => void }) {
  const [state, action, pending] = useActionState(liberarEmergenciaAction, undefined);
  const [aplicacaoId, setAplicacaoId] = useState(usuario.aplicacoes[0]?.id ?? "");
  const [tipoSaque, setTipoSaque] = useState<"TOTAL" | "PARCIAL">("TOTAL");
  const [valorMaximo, setValorMaximo] = useState("");
  const [prazoValidade, setPrazoValidade] = useState("");
  const router = useRouter();
  const processado = useRef(false);

  useEffect(() => {
    if (state?.sucesso && !processado.current) {
      processado.current = true;
      router.refresh();
      const timeout = setTimeout(onClose, 2200);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const aplicacao = useMemo(
    () => usuario.aplicacoes.find((a) => a.id === aplicacaoId) ?? null,
    [usuario.aplicacoes, aplicacaoId]
  );
  const valorMaximoNumero = Number(valorMaximo.replace(/\./g, "").replace(",", ".")) || 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-red-500/40 bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="flex items-center gap-2 text-lg font-semibold text-red-300">
          <IconAlert width={18} height={18} /> Liberar saque emergencial
        </h3>

        <div className="mt-3 rounded-xl border border-border bg-surface-2 p-4 text-xs">
          <p className="font-semibold text-foreground">{usuario.nome}</p>
          <p className="text-muted">{usuario.email}</p>
          <p className="mt-1 font-mono text-[10px] text-muted">ID: {usuario.id}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-muted">Capital disponível</p>
              <p className="font-semibold text-emerald-300">{formatMoeda(usuario.capitalDisponivel)}</p>
            </div>
            <div>
              <p className="text-muted">Rendimento disponível</p>
              <p className="font-semibold text-gold-light">{formatMoeda(usuario.rendimento)}</p>
            </div>
          </div>
        </div>

        {state?.sucesso ? (
          <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {state.sucesso}
          </p>
        ) : (
          <form action={action} className="mt-4 space-y-4">
            <input type="hidden" name="userId" value={usuario.id} />

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground/90">Aplicação a ser liberada</span>
              <select
                name="aplicacaoId"
                value={aplicacaoId}
                onChange={(e) => {
                  setAplicacaoId(e.target.value);
                  setValorMaximo("");
                }}
                required
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-red-400/60"
              >
                {usuario.aplicacoes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {formatMoeda(a.valor)} · desde {formatData(new Date(a.criadoEm))} ·{" "}
                    {a.emCarencia ? `carência até ${formatData(new Date(a.liberaEm))}` : "já disponível"}
                  </option>
                ))}
              </select>
            </label>

            {aplicacao && (
              <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs text-muted">
                <div className="flex justify-between">
                  <span>Saldo total da aplicação</span>
                  <span className="font-semibold text-foreground">{formatMoeda(aplicacao.valor)}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span>Início da aplicação</span>
                  <span className="text-foreground">{formatData(new Date(aplicacao.criadoEm))}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span>Fim previsto da carência</span>
                  <span className="text-foreground">{formatData(new Date(aplicacao.liberaEm))}</span>
                </div>
              </div>
            )}

            <div>
              <span className="mb-1 block text-sm font-medium text-foreground/90">Tipo de saque</span>
              <div className="grid grid-cols-2 gap-2">
                {(["TOTAL", "PARCIAL"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTipoSaque(t);
                      if (t === "TOTAL" && aplicacao) {
                        setValorMaximo(aplicacao.valor.toFixed(2).replace(".", ","));
                      }
                    }}
                    className={`rounded-lg py-2 text-xs font-semibold transition ${
                      tipoSaque === t ? "bg-red-500/20 text-red-300" : "bg-white/5 text-muted hover:bg-white/10"
                    }`}
                  >
                    {t === "TOTAL" ? "Total" : "Parcial"}
                  </button>
                ))}
              </div>
              <input type="hidden" name="tipoSaque" value={tipoSaque} />
            </div>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground/90">Valor máximo autorizado</span>
              <MoneyInput
                name="valorMaximo"
                value={tipoSaque === "TOTAL" ? (aplicacao?.valor.toFixed(2).replace(".", ",") ?? "") : valorMaximo}
                onValueChange={setValorMaximo}
                disabled={tipoSaque === "TOTAL"}
                placeholder="0,00"
                required
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-red-400/60 disabled:opacity-60"
              />
              {tipoSaque === "PARCIAL" && aplicacao && (
                <span className="mt-1 block text-xs text-muted">Máximo: {formatMoeda(aplicacao.valor)}</span>
              )}
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground/90">Prazo de validade da autorização</span>
              <input
                name="prazoValidade"
                type="date"
                value={prazoValidade}
                onChange={(e) => setPrazoValidade(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                required
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-red-400/60"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground/90">Justificativa da liberação</span>
              <textarea
                name="motivo"
                required
                minLength={10}
                rows={3}
                placeholder="Descreva o motivo da emergência..."
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-red-400/60"
              />
            </label>

            {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-border/60 py-3 text-sm font-semibold text-muted hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending || !aplicacaoId || !prazoValidade || valorMaximoNumero <= 0}
                className="flex-1 rounded-xl bg-red-500/90 py-3 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {pending ? "Liberando..." : "Confirmar liberação"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
