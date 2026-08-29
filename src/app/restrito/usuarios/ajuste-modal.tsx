"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoeda } from "@/lib/format";
import { MoneyInput } from "@/components/ui/money-input";
import { ajustarSaldoUsuario } from "./ajuste-actions";
import { LABEL_TIPO_CHAVE_PIX, type TipoChavePixForm } from "@/lib/pix-chave";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  capital: number;
  rendimento: number;
  bonus: number;
  incentivoLideranca?: number;
  ehLider?: boolean;
};

const TIPOS = [
  { valor: "CAPITAL", label: "Capital Principal" },
  { valor: "RENDIMENTO", label: "PLR / Rendimento disponível" },
  { valor: "BONUS", label: "Bônus de indicação" },
  { valor: "INCENTIVO_LIDERANCA", label: "Incentivo de liderança", soLider: true },
] as const;

export function AjusteSaldoButton({ usuario }: { usuario: Usuario }) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        title="Ajustar saldo"
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15 text-gold-light transition hover:bg-gold/25"
      >
        $
      </button>
      {aberto && <AjusteSaldoModal usuario={usuario} onClose={() => setAberto(false)} />}
    </>
  );
}

function AjusteSaldoModal({ usuario, onClose }: { usuario: Usuario; onClose: () => void }) {
  const [state, action, pending] = useActionState(ajustarSaldoUsuario, undefined);
  const [operacao, setOperacao] = useState<"ADICIONAR" | "DEFINIR" | "APAGAR" | "SAQUE">("ADICIONAR");
  const [tipos, setTipos] = useState<string[]>([]);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [chavePix, setChavePix] = useState("");
  const [chavePixTipo, setChavePixTipo] = useState<TipoChavePixForm | "">("");
  const router = useRouter();
  const processado = useRef(false);

  const tiposDisponiveis = TIPOS.filter((t) => !("soLider" in t && t.soLider) || usuario.ehLider);

  useEffect(() => {
    if (state?.sucesso && !processado.current) {
      processado.current = true;
      router.refresh();
      const timeout = setTimeout(onClose, 1800);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function toggleTipo(valor: string) {
    setTipos((atual) =>
      atual.includes(valor) ? atual.filter((t) => t !== valor) : [...atual, valor]
    );
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
        <h3 className="text-lg font-semibold text-foreground">Ajuste de saldo</h3>

        <div className="mt-3 rounded-xl border border-border bg-surface-2 p-4">
          <p className="font-semibold text-foreground">{usuario.nome}</p>
          <p className="text-xs text-muted">{usuario.email}</p>
          <div
            className={`mt-3 grid gap-2 text-center text-xs ${usuario.ehLider ? "grid-cols-4" : "grid-cols-3"}`}
          >
            <div>
              <p className="text-muted">Capital</p>
              <p className="font-semibold text-emerald-300">{formatMoeda(usuario.capital)}</p>
            </div>
            <div>
              <p className="text-muted">PLR disp.</p>
              <p className="font-semibold text-gold-light">{formatMoeda(usuario.rendimento)}</p>
            </div>
            <div>
              <p className="text-muted">Bônus</p>
              <p className="font-semibold text-fuchsia-300">{formatMoeda(usuario.bonus)}</p>
            </div>
            {usuario.ehLider && (
              <div>
                <p className="text-muted">Incentivo</p>
                <p className="font-semibold text-gold-light">
                  {formatMoeda(usuario.incentivoLideranca ?? 0)}
                </p>
              </div>
            )}
          </div>
        </div>

        {state?.sucesso ? (
          <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {state.sucesso}
          </p>
        ) : (
          <form
            action={action}
            onSubmit={(e) => {
              if (operacao === "APAGAR") {
                const labels = tipos
                  .map((t) => TIPOS.find((item) => item.valor === t)?.label ?? t)
                  .join(", ");
                if (!confirm(`Zerar ${labels} de ${usuario.nome}? Essa ação não pode ser desfeita.`)) {
                  e.preventDefault();
                }
              }
              if (operacao === "SAQUE") {
                const labels = tipos
                  .map((t) => TIPOS.find((item) => item.valor === t)?.label ?? t)
                  .join(", ");
                if (
                  !confirm(
                    `Confirma o saque de ${labels} de ${usuario.nome} pra chave Pix "${chavePix}"? Essa ação não pode ser desfeita.`
                  )
                ) {
                  e.preventDefault();
                }
              }
            }}
            className="mt-4 space-y-4"
          >
            <input type="hidden" name="userId" value={usuario.id} />
            <input type="hidden" name="operacao" value={operacao} />

            <div>
              <span className="mb-1 block text-sm font-medium text-foreground/90">
                Tipo de operação
              </span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={() => setOperacao("ADICIONAR")}
                  className={`rounded-lg py-2 text-xs font-semibold transition sm:text-sm ${
                    operacao === "ADICIONAR"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-white/5 text-muted"
                  }`}
                >
                  + Adicionar
                </button>
                <button
                  type="button"
                  onClick={() => setOperacao("DEFINIR")}
                  className={`rounded-lg py-2 text-xs font-semibold transition sm:text-sm ${
                    operacao === "DEFINIR"
                      ? "bg-sky-500/20 text-sky-300"
                      : "bg-white/5 text-muted"
                  }`}
                >
                  $ Definir
                </button>
                <button
                  type="button"
                  onClick={() => setOperacao("SAQUE")}
                  className={`rounded-lg py-2 text-xs font-semibold transition sm:text-sm ${
                    operacao === "SAQUE"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-white/5 text-muted"
                  }`}
                >
                  ↓ Saque
                </button>
                <button
                  type="button"
                  onClick={() => setOperacao("APAGAR")}
                  className={`rounded-lg py-2 text-xs font-semibold transition sm:text-sm ${
                    operacao === "APAGAR" ? "bg-red-500/20 text-red-300" : "bg-white/5 text-muted"
                  }`}
                >
                  ✕ Apagar
                </button>
              </div>
              {operacao === "SAQUE" && (
                <p className="mt-2 text-xs text-muted">
                  Use pra ajudar quem tem dificuldade de sacar sozinho no app. Ignora a carência
                  do Capital (libera antes do prazo) e não tem restrição de dia ou horário — só
                  segue o modo automático/manual configurado.
                </p>
              )}
            </div>

            <div>
              <span className="mb-1 block text-sm font-medium text-foreground/90">
                {operacao === "APAGAR"
                  ? "Selecione os tipos de saldo pra zerar"
                  : "Selecione os tipos de saldo e o valor de cada um"}
              </span>
              <div className="space-y-2">
                {tiposDisponiveis.map((t) => {
                  const selecionado = tipos.includes(t.valor);
                  return (
                    <div
                      key={t.valor}
                      className={`rounded-lg border px-3 py-2 transition ${
                        selecionado ? "border-gold/50 bg-surface-2" : "border-border bg-surface-2"
                      }`}
                    >
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="tipos"
                          value={t.valor}
                          checked={selecionado}
                          onChange={() => toggleTipo(t.valor)}
                          className="accent-gold"
                        />
                        {t.label}
                      </label>
                      {selecionado && operacao !== "APAGAR" && (
                        <MoneyInput
                          name={`valor_${t.valor}`}
                          value={valores[t.valor] ?? ""}
                          onValueChange={(v) => setValores((atual) => ({ ...atual, [t.valor]: v }))}
                          placeholder="0,00"
                          required
                          className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              {operacao === "DEFINIR" && tipos.length > 0 && (
                <span className="mt-2 block text-xs text-muted">
                  "Definir" ajusta o saldo pra esse valor exato — pode aumentar ou diminuir.
                  A redução só usa saldo livre (não reservado num saque em andamento).
                </span>
              )}
              {operacao === "APAGAR" && tipos.length > 0 && (
                <span className="mt-2 block text-xs text-red-300/90">
                  Isso zera o saldo livre desses tipos pra esse usuário — use se um lançamento
                  foi feito pra pessoa errada. Não afeta valores já reservados num saque em
                  andamento.
                </span>
              )}
            </div>

            {operacao === "SAQUE" && (
              <>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-foreground/90">Tipo da chave Pix</span>
                  <select
                    name="chavePixTipo"
                    value={chavePixTipo}
                    onChange={(e) => setChavePixTipo(e.target.value as TipoChavePixForm)}
                    required
                    className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-amber-400/60"
                  >
                    <option value="" disabled>
                      Selecione...
                    </option>
                    {(Object.keys(LABEL_TIPO_CHAVE_PIX) as TipoChavePixForm[]).map((t) => (
                      <option key={t} value={t}>
                        {LABEL_TIPO_CHAVE_PIX[t]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-foreground/90">
                    Chave Pix (pra onde o valor vai)
                  </span>
                  <input
                    name="chavePix"
                    type="text"
                    value={chavePix}
                    onChange={(e) => setChavePix(e.target.value)}
                    placeholder="Valor da chave escolhida acima"
                    required
                    className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-amber-400/60"
                  />
                </label>
              </>
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
                disabled={
                  pending ||
                  tipos.length === 0 ||
                  (operacao === "SAQUE" && (!chavePix.trim() || !chavePixTipo))
                }
                className={`flex-1 rounded-xl py-3 text-sm font-semibold disabled:opacity-50 ${
                  operacao === "APAGAR"
                    ? "bg-red-500/80 text-white hover:bg-red-500"
                    : operacao === "SAQUE"
                      ? "bg-amber-500/90 text-black hover:bg-amber-500"
                      : "bg-gradient-to-br from-[#f2d675] via-[#d4af37] to-[#93731f] text-black"
                }`}
              >
                {pending
                  ? "Processando..."
                  : operacao === "ADICIONAR"
                    ? "Adicionar valores"
                    : operacao === "DEFINIR"
                      ? "Definir valores"
                      : operacao === "SAQUE"
                        ? "Realizar saque"
                        : "Apagar valores"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
