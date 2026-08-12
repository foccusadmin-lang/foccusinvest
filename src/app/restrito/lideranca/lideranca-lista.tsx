"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatMoeda, formatData } from "@/lib/format";
import { MoneyInput } from "@/components/ui/money-input";
import { gerenciarIncentivoAction, removerLiderancaAction } from "./actions";

export type LiderLinha = {
  id: string;
  nome: string;
  email: string;
  capital: number;
  incentivoAcumulado: number;
  incentivoDisponivel: number;
  desde: Date;
};

export function LiderancaLista({ lideres }: { lideres: LiderLinha[] }) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return lideres;
    return lideres.filter(
      (l) => l.nome.toLowerCase().includes(termo) || l.email.toLowerCase().includes(termo)
    );
  }, [lideres, busca]);

  return (
    <>
      <div className="mb-4">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          type="text"
          placeholder="Buscar líder por nome ou e-mail..."
          className="w-full max-w-md rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
        />
      </div>

      {filtrados.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
          {lideres.length === 0 ? "Nenhum líder cadastrado ainda." : "Nenhum resultado pra essa busca."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Líder</th>
                <th className="px-4 py-3">Capital</th>
                <th className="px-4 py-3">Incentivo acumulado</th>
                <th className="px-4 py-3">Incentivo disponível</th>
                <th className="px-4 py-3">Líder desde</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtrados.map((l) => (
                <tr key={l.id} className="bg-surface align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{l.nome}</p>
                    <p className="text-xs text-muted">{l.email}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-300">{formatMoeda(l.capital)}</td>
                  <td className="px-4 py-3 text-gold-light">{formatMoeda(l.incentivoAcumulado)}</td>
                  <td className="px-4 py-3 font-semibold text-gold-light">
                    {formatMoeda(l.incentivoDisponivel)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{formatData(l.desde)}</td>
                  <td className="px-4 py-3">
                    <LiderAcoes lider={l} />
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

function LiderAcoes({ lider }: { lider: LiderLinha }) {
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => setAberto(true)}
        className="rounded-lg bg-gold/15 px-3 py-1 text-xs font-semibold text-gold-light hover:bg-gold/25"
      >
        Gerenciar incentivo
      </button>
      <button
        disabled={isPending}
        onClick={() => {
          if (!confirm(`Remover a liderança de ${lider.nome}? O incentivo já acumulado continua na conta.`)) return;
          startTransition(async () => {
            await removerLiderancaAction(lider.id);
            router.refresh();
          });
        }}
        className="rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold text-muted hover:bg-white/15 disabled:opacity-50"
      >
        Remover liderança
      </button>
      {aberto && <GerenciarIncentivoModal lider={lider} onClose={() => setAberto(false)} />}
    </div>
  );
}

function GerenciarIncentivoModal({ lider, onClose }: { lider: LiderLinha; onClose: () => void }) {
  const [state, action, pending] = useActionState(gerenciarIncentivoAction, undefined);
  const [operacao, setOperacao] = useState<"ADICIONAR" | "DEFINIR" | "EXCLUIR">("ADICIONAR");
  const [valor, setValor] = useState("");
  const router = useRouter();
  const processado = useRef(false);

  useEffect(() => {
    if (state?.sucesso && !processado.current) {
      processado.current = true;
      router.refresh();
      const timeout = setTimeout(onClose, 1800);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-gold/40 bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gold-light">Incentivo de liderança</h3>
        <p className="mt-1 text-sm text-muted">{lider.nome}</p>
        <p className="text-xs text-muted">{lider.email}</p>

        <div className="mt-3 rounded-xl border border-border bg-surface-2 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted">Disponível agora</p>
          <p className="text-sm font-semibold text-gold-light">
            {formatMoeda(lider.incentivoDisponivel)}
          </p>
        </div>

        {state?.sucesso ? (
          <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {state.sucesso}
          </p>
        ) : (
          <form
            action={action}
            onSubmit={(e) => {
              if (operacao === "EXCLUIR") {
                if (!confirm(`Zerar o incentivo de liderança disponível de ${lider.nome}?`)) {
                  e.preventDefault();
                }
              }
            }}
            className="mt-4 space-y-4"
          >
            <input type="hidden" name="userId" value={lider.id} />
            <input type="hidden" name="operacao" value={operacao} />

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setOperacao("ADICIONAR")}
                className={`rounded-lg py-2 text-xs font-semibold transition ${
                  operacao === "ADICIONAR" ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-muted"
                }`}
              >
                + Adicionar
              </button>
              <button
                type="button"
                onClick={() => setOperacao("DEFINIR")}
                className={`rounded-lg py-2 text-xs font-semibold transition ${
                  operacao === "DEFINIR" ? "bg-sky-500/20 text-sky-300" : "bg-white/5 text-muted"
                }`}
              >
                $ Ajustar
              </button>
              <button
                type="button"
                onClick={() => setOperacao("EXCLUIR")}
                className={`rounded-lg py-2 text-xs font-semibold transition ${
                  operacao === "EXCLUIR" ? "bg-red-500/20 text-red-300" : "bg-white/5 text-muted"
                }`}
              >
                ✕ Excluir
              </button>
            </div>

            {operacao !== "EXCLUIR" && (
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-foreground/90">
                  {operacao === "ADICIONAR" ? "Valor a adicionar" : "Novo valor disponível"}
                </span>
                <MoneyInput
                  name="valor"
                  value={valor}
                  onValueChange={setValor}
                  placeholder="0,00"
                  required
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
                />
              </label>
            )}

            {operacao === "EXCLUIR" && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                Zera o incentivo de liderança ainda disponível (não usado nem reservado num
                saque) — não afeta o que já foi sacado ou reaplicado.
              </p>
            )}

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
                disabled={pending}
                className={`flex-1 rounded-xl py-3 text-sm font-semibold disabled:opacity-50 ${
                  operacao === "EXCLUIR"
                    ? "bg-red-500/80 text-white hover:bg-red-500"
                    : "bg-gold text-black hover:brightness-110"
                }`}
              >
                {pending ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
