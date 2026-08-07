"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoeda } from "@/lib/format";
import { MoneyInput } from "@/components/ui/money-input";
import { IconClock, IconPlus } from "@/components/icons";
import { ajustarCarenciaUsuario } from "./carencia-actions";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  capitalDisponivel: number;
  capitalCarencia: number;
};

type Faixa = { id: string; valor: string; data: string };

let proximoId = 0;
function novaFaixa(valor = "", data = ""): Faixa {
  proximoId += 1;
  return { id: `faixa-${proximoId}`, valor, data };
}

export function AjusteCarenciaButton({ usuario }: { usuario: Usuario }) {
  const [aberto, setAberto] = useState(false);
  const totalLivre = usuario.capitalDisponivel + usuario.capitalCarencia;

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        title="Ajustar carência"
        disabled={totalLivre <= 0}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15 text-purple-300 transition hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <IconClock width={14} height={14} />
      </button>
      {aberto && <AjusteCarenciaModal usuario={usuario} onClose={() => setAberto(false)} />}
    </>
  );
}

function AjusteCarenciaModal({ usuario, onClose }: { usuario: Usuario; onClose: () => void }) {
  const [state, action, pending] = useActionState(ajustarCarenciaUsuario, undefined);
  const totalLivre = usuario.capitalDisponivel + usuario.capitalCarencia;
  const [valorDisponivel, setValorDisponivel] = useState(
    usuario.capitalDisponivel.toFixed(2).replace(".", ",")
  );
  const [faixas, setFaixas] = useState<Faixa[]>(() => [
    novaFaixa(usuario.capitalCarencia > 0 ? usuario.capitalCarencia.toFixed(2).replace(".", ",") : ""),
  ]);
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

  const valorDisponivelNumero = Number(valorDisponivel.replace(/\./g, "").replace(",", ".")) || 0;
  const totalFaixas = faixas.reduce(
    (acc, f) => acc + (Number(f.valor.replace(/\./g, "").replace(",", ".")) || 0),
    0
  );
  const totalAlocado = valorDisponivelNumero + totalFaixas;
  const restanteAlocar = totalLivre - totalAlocado;
  const faixaSemData = faixas.some(
    (f) => (Number(f.valor.replace(/\./g, "").replace(",", ".")) || 0) > 0.005 && !f.data
  );

  function atualizarFaixa(id: string, campo: "valor" | "data", valor: string) {
    setFaixas((atual) => atual.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)));
  }

  function adicionarFaixa() {
    setFaixas((atual) => [
      ...atual,
      novaFaixa(restanteAlocar > 0 ? restanteAlocar.toFixed(2).replace(".", ",") : ""),
    ]);
  }

  function removerFaixa(id: string) {
    setFaixas((atual) => (atual.length > 1 ? atual.filter((f) => f.id !== id) : atual));
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
        <h3 className="text-lg font-semibold text-foreground">Ajustar carência</h3>
        <p className="mt-1 text-xs text-muted">
          Define quanto do capital livre desse investidor fica disponível pra saque agora, e em
          quais datas o restante sai da carência — dá pra dividir em mais de uma faixa, caso ele
          tenha aportado em datas diferentes.
        </p>

        <div className="mt-3 rounded-xl border border-border bg-surface-2 p-4">
          <p className="font-semibold text-foreground">{usuario.nome}</p>
          <p className="text-xs text-muted">{usuario.email}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
            <div>
              <p className="text-muted">Disponível hoje</p>
              <p className="font-semibold text-emerald-300">
                {formatMoeda(usuario.capitalDisponivel)}
              </p>
            </div>
            <div>
              <p className="text-muted">Em carência</p>
              <p className="font-semibold text-amber-300">{formatMoeda(usuario.capitalCarencia)}</p>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-muted">
            Total livre pra redistribuir: <strong>{formatMoeda(totalLivre)}</strong>
          </p>
        </div>

        {totalLivre <= 0 ? (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
            Esse investidor não tem capital livre pra ajustar (tudo já está reservado num saque
            ou é zero).
          </p>
        ) : state?.sucesso ? (
          <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {state.sucesso}
          </p>
        ) : (
          <form action={action} className="mt-4 space-y-4">
            <input type="hidden" name="userId" value={usuario.id} />
            <input type="hidden" name="quantidadeFaixas" value={faixas.length} />

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground/90">
                Valor disponível pra saque agora
              </span>
              <MoneyInput
                name="valorDisponivel"
                value={valorDisponivel}
                onValueChange={setValorDisponivel}
                placeholder="0,00"
                required
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-purple-400/60"
              />
              <span className="mt-1 block text-xs text-muted">
                Máximo: {formatMoeda(totalLivre)}
              </span>
            </label>

            <div className="space-y-3">
              {faixas.map((faixa, i) => (
                <div key={faixa.id} className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-200">
                      Valor em carência {faixas.length > 1 ? `(faixa ${i + 1})` : ""}
                    </span>
                    {faixas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removerFaixa(faixa.id)}
                        className="text-xs text-red-300 hover:underline"
                      >
                        Remover
                      </button>
                    )}
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <MoneyInput
                      name={`carenciaValor_${i}`}
                      value={faixa.valor}
                      onValueChange={(v) => atualizarFaixa(faixa.id, "valor", v)}
                      placeholder="0,00"
                      className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-purple-400/60"
                    />
                    <input
                      name={`carenciaData_${i}`}
                      type="date"
                      value={faixa.data}
                      onChange={(e) => atualizarFaixa(faixa.id, "data", e.target.value)}
                      className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-purple-400/60"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={adicionarFaixa}
                className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border py-2 text-xs font-semibold text-muted hover:border-purple-400/60 hover:text-purple-300"
              >
                <IconPlus width={12} height={12} /> Adicionar outra faixa em carência
              </button>
            </div>

            <div
              className={`rounded-lg border p-3 text-xs ${
                Math.abs(restanteAlocar) <= 0.005
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-red-500/30 bg-red-500/10 text-red-300"
              }`}
            >
              {Math.abs(restanteAlocar) <= 0.005
                ? "Valor totalmente distribuído."
                : restanteAlocar > 0
                  ? `Falta distribuir ${formatMoeda(restanteAlocar)} (some ao disponível ou a uma faixa).`
                  : `Passou ${formatMoeda(Math.abs(restanteAlocar))} do total livre — reduza algum valor.`}
            </div>

            {faixaSemData && (
              <p className="text-sm text-red-400">Informe a data de liberação de cada faixa em carência preenchida.</p>
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
                disabled={pending || Math.abs(restanteAlocar) > 0.005 || faixaSemData}
                className="flex-1 rounded-xl bg-purple-500/90 py-3 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
              >
                {pending ? "Salvando..." : "Salvar ajuste"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
