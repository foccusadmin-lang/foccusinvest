"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MaskedInput } from "@/components/ui/masked-input";
import { criarEntidade } from "./actions";

const TIPOS = [
  { valor: "IGREJA", label: "Igreja" },
  { valor: "ONG", label: "ONG" },
  { valor: "ASSOCIACAO", label: "Associação" },
  { valor: "INSTITUTO", label: "Instituto" },
  { valor: "PROJETO_SOCIAL", label: "Projeto social" },
  { valor: "OUTRO", label: "Outro" },
] as const;

export function CriarEntidadeButton() {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-xl bg-gradient-to-br from-[#f2d675] via-[#d4af37] to-[#93731f] px-4 py-2.5 text-sm font-semibold text-black"
      >
        + Nova entidade
      </button>
      {aberto && <CriarEntidadeModal onClose={() => setAberto(false)} />}
    </>
  );
}

function CriarEntidadeModal({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState(criarEntidade, undefined);
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
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-foreground">Cadastrar entidade</h3>
        <p className="mt-1 text-xs text-muted">
          Cria a conta da entidade. Depois é preciso aprovar documentos, marcar termos aceitos e
          ativar pra ela poder receber doações e aplicações.
        </p>

        {state?.sucesso ? (
          <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {state.sucesso}
          </p>
        ) : (
          <form action={action} className="mt-4 space-y-3">
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

            <Campo name="razaoSocial" label="Razão social" required />
            <Campo name="nomeFantasia" label="Nome fantasia" />
            <Campo name="cnpj" label="CNPJ" mask="cnpj" required />
            <Campo name="email" label="E-mail" type="email" required />
            <Campo name="representanteLegal" label="Nome do responsável legal" required />
            <Campo name="cpfRepresentante" label="CPF do responsável" mask="cpf" required />
            <Campo name="telefone" label="Telefone" mask="telefone" />
            <Campo name="endereco" label="Endereço completo" />
            <div className="grid grid-cols-2 gap-3">
              <Campo name="cidade" label="Cidade" />
              <Campo name="estado" label="Estado (UF)" />
            </div>
            <Campo name="chavePix" label="Chave Pix (pra receber saques depois)" />
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground/90">Descrição pra tela de doação</span>
              <textarea
                name="descricao"
                rows={3}
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
              />
            </label>
            <Campo
              name="taxaAtivacao"
              label="Taxa de ativação (R$)"
              placeholder="100"
              defaultValue="100"
            />

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
                {pending ? "Salvando..." : "Cadastrar entidade"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Campo({
  name,
  label,
  type = "text",
  required,
  placeholder,
  defaultValue,
  mask,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  mask?: "cpf" | "cnpj" | "telefone";
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-foreground/90">{label}</span>
      {mask ? (
        <MaskedInput
          name={name}
          mask={mask}
          required={required}
          defaultValue={defaultValue}
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          defaultValue={defaultValue}
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
        />
      )}
    </label>
  );
}
