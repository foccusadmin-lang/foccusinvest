"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { converterUsuarioEmEntidadeAction } from "./actions";

const TIPOS = [
  { valor: "IGREJA", label: "Igreja" },
  { valor: "ONG", label: "ONG" },
  { valor: "ASSOCIACAO", label: "Associação" },
  { valor: "INSTITUTO", label: "Instituto" },
  { valor: "PROJETO_SOCIAL", label: "Projeto social" },
  { valor: "OUTRO", label: "Outro" },
] as const;

export function ConverterUsuarioButton() {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-xl border border-border/60 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-white/5"
      >
        Transformar investidor PJ em entidade
      </button>
      {aberto && <ConverterUsuarioModal onClose={() => setAberto(false)} />}
    </>
  );
}

function ConverterUsuarioModal({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState(converterUsuarioEmEntidadeAction, undefined);
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-foreground">Transformar investidor PJ em entidade</h3>
        <p className="mt-1 text-xs text-muted">
          Pra quando a igreja/ONG/associação já tinha uma conta Pessoa Jurídica cadastrada como
          investidor. Mantém e-mail, capital e histórico — só adiciona o perfil de Entidade.
        </p>

        {state?.sucesso ? (
          <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {state.sucesso}
          </p>
        ) : (
          <form action={action} className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground/90">CNPJ do investidor já cadastrado</span>
              <input
                name="cnpj"
                type="text"
                placeholder="00.000.000/0000-00"
                required
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
              />
            </label>

            <div>
              <span className="mb-1 block text-sm font-medium text-foreground/90">Tipo de entidade</span>
              <select
                name="tipoEntidade"
                defaultValue="OUTRO"
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
              >
                {TIPOS.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground/90">Chave Pix</span>
              <input
                name="chavePix"
                type="text"
                required
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground/90">Taxa de ativação (R$)</span>
              <input
                name="taxaAtivacao"
                type="text"
                defaultValue="100"
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
              />
            </label>

            {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

            <div className="flex gap-2 pt-2">
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
                className="flex-1 rounded-xl bg-gradient-to-br from-[#f2d675] via-[#d4af37] to-[#93731f] py-3 text-sm font-semibold text-black disabled:opacity-50"
              >
                {pending ? "Salvando..." : "Transformar em entidade"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
