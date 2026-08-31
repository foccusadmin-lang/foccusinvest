"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoeda } from "@/lib/format";
import { MoneyInput } from "@/components/ui/money-input";
import { transferirSaldoCapital } from "./actions";

export type UsuarioTransferencia = {
  id: string;
  nome: string;
  email: string;
  capital: number;
};

export function TransferenciaForm({ usuarios }: { usuarios: UsuarioTransferencia[] }) {
  const [busca, setBusca] = useState("");
  const [origemId, setOrigemId] = useState<string | null>(null);
  const [destinoId, setDestinoId] = useState<string | null>(null);
  const [valorTexto, setValorTexto] = useState("");
  const [state, action, pending] = useActionState(transferirSaldoCapital, undefined);
  const router = useRouter();
  const processado = useRef(false);

  useEffect(() => {
    if (state?.sucesso && !processado.current) {
      processado.current = true;
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return usuarios;
    return usuarios.filter(
      (u) => u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo)
    );
  }, [usuarios, busca]);

  const origem = usuarios.find((u) => u.id === origemId) ?? null;
  const destino = usuarios.find((u) => u.id === destinoId) ?? null;

  function confirmarEnvio(e: React.FormEvent<HTMLFormElement>) {
    if (!origem || !destino) {
      e.preventDefault();
      return;
    }
    const valorNumerico = Number(valorTexto.replace(/\./g, "").replace(",", ".")) || 0;
    const confirmado = window.confirm(
      `Confirma transferir ${formatMoeda(valorNumerico)} de "${origem.nome}" (${origem.email}) para "${destino.nome}" (${destino.email})? Essa ação não pode ser desfeita.`
    );
    if (!confirmado) e.preventDefault();
  }

  return (
    <div className="mt-6 space-y-4">
      {state?.sucesso && (
        <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          {state.sucesso}
        </p>
      )}
      {state?.error && (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SelecaoResumo titulo="Origem" usuario={origem} tom="red" onLimpar={() => setOrigemId(null)} />
        <SelecaoResumo titulo="Destino" usuario={destino} tom="emerald" onLimpar={() => setDestinoId(null)} />
      </div>

      <form action={action} onSubmit={confirmarEnvio} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="origemUserId" value={origemId ?? ""} />
        <input type="hidden" name="destinoUserId" value={destinoId ?? ""} />
        <label className="text-sm">
          <span className="mb-1 block font-medium text-foreground/90">Valor a transferir (R$)</span>
          <MoneyInput
            name="valor"
            value={valorTexto}
            onValueChange={setValorTexto}
            placeholder="0,00"
            className="w-40 rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
          />
        </label>
        <button
          type="submit"
          disabled={pending || !origem || !destino}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-50"
        >
          {pending ? "Transferindo..." : "Confirmar transferência"}
        </button>
      </form>

      <div>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          className="w-full max-w-md rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Investidor</th>
              <th className="px-4 py-3">Capital atual</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-muted">
                  Nenhum investidor ativo encontrado.
                </td>
              </tr>
            ) : (
              filtrados.map((u) => (
                <tr key={u.id} className="bg-surface">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{u.nome}</p>
                    <p className="text-xs text-muted">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">{formatMoeda(u.capital)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setOrigemId(u.id)}
                        disabled={destinoId === u.id}
                        className={`rounded-lg px-3 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                          origemId === u.id
                            ? "bg-red-500 text-black"
                            : "bg-red-500/15 text-red-300 hover:bg-red-500/25"
                        }`}
                      >
                        Origem
                      </button>
                      <button
                        type="button"
                        onClick={() => setDestinoId(u.id)}
                        disabled={origemId === u.id}
                        className={`rounded-lg px-3 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                          destinoId === u.id
                            ? "bg-emerald-500 text-black"
                            : "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                        }`}
                      >
                        Destino
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SelecaoResumo({
  titulo,
  usuario,
  tom,
  onLimpar,
}: {
  titulo: string;
  usuario: UsuarioTransferencia | null;
  tom: "red" | "emerald";
  onLimpar: () => void;
}) {
  const cores =
    tom === "red"
      ? "border-red-500/30 bg-red-500/10 text-red-300"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";

  return (
    <div className={`rounded-2xl border p-4 ${cores}`}>
      <p className="text-xs font-semibold uppercase tracking-wider">{titulo}</p>
      {usuario ? (
        <div className="mt-2 flex items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-foreground">{usuario.nome}</p>
            <p className="text-xs text-muted">{usuario.email}</p>
            <p className="mt-1 text-sm font-semibold">{formatMoeda(usuario.capital)} de capital</p>
          </div>
          <button
            type="button"
            onClick={onLimpar}
            className="shrink-0 rounded-lg bg-white/10 px-2 py-1 text-xs font-semibold text-muted hover:bg-white/15"
          >
            Trocar
          </button>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">Selecione na lista abaixo.</p>
      )}
    </div>
  );
}
