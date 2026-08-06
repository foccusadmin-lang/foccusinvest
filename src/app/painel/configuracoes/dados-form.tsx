"use client";

import { useActionState, useState } from "react";
import { MaskedInput } from "@/components/ui/masked-input";
import { atualizarDadosPessoais } from "./actions";

export function DadosPessoaisForm({
  email,
  telefone,
  endereco,
  nome,
  labelNome,
  tipoPessoa,
  cpf,
  dataNascimento,
  cnpj,
  representanteLegal,
  cpfRepresentante,
}: {
  email: string;
  telefone: string;
  endereco: string;
  nome: string;
  labelNome: string;
  tipoPessoa: "FISICA" | "JURIDICA";
  cpf: string;
  dataNascimento: string;
  cnpj: string;
  representanteLegal: string;
  cpfRepresentante: string;
}) {
  const [state, action, pending] = useActionState(atualizarDadosPessoais, undefined);
  const [editando, setEditando] = useState(false);

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="mt-4 rounded-lg bg-gold/15 px-4 py-2 text-sm font-semibold text-gold-light hover:bg-gold/25"
      >
        Alterar meus dados
      </button>
    );
  }

  return (
    <form action={action} className="mt-4 space-y-4 rounded-2xl border border-border bg-surface-2 p-4">
      <p className="text-xs text-muted">
        Confira com atenção antes de salvar — {tipoPessoa === "FISICA" ? "CPF" : "CNPJ"} errado
        pode atrasar seus saques.
      </p>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-foreground/90">{labelNome}</span>
        <input
          name="nome"
          type="text"
          defaultValue={nome}
          required
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground outline-none focus:border-gold/60"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-foreground/90">E-mail</span>
        <input
          name="email"
          type="email"
          defaultValue={email}
          required
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground outline-none focus:border-gold/60"
        />
      </label>

      {tipoPessoa === "FISICA" ? (
        <>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-foreground/90">CPF</span>
            <MaskedInput
              name="cpf"
              mask="cpf"
              defaultValue={cpf}
              required
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground outline-none focus:border-gold/60"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-foreground/90">Data de nascimento</span>
            <input
              name="dataNascimento"
              type="date"
              defaultValue={dataNascimento}
              required
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground outline-none focus:border-gold/60"
            />
          </label>
        </>
      ) : (
        <>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-foreground/90">CNPJ</span>
            <MaskedInput
              name="cnpj"
              mask="cnpj"
              defaultValue={cnpj}
              required
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground outline-none focus:border-gold/60"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-foreground/90">Representante legal</span>
            <input
              name="representanteLegal"
              type="text"
              defaultValue={representanteLegal}
              required
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground outline-none focus:border-gold/60"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-foreground/90">CPF do representante</span>
            <MaskedInput
              name="cpfRepresentante"
              mask="cpf"
              defaultValue={cpfRepresentante}
              required
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground outline-none focus:border-gold/60"
            />
          </label>
        </>
      )}

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-foreground/90">Telefone</span>
        <MaskedInput
          name="telefone"
          mask="telefone"
          defaultValue={telefone}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground outline-none focus:border-gold/60"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-foreground/90">Endereço</span>
        <input
          name="endereco"
          type="text"
          defaultValue={endereco}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground outline-none focus:border-gold/60"
        />
      </label>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state?.sucesso && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          {state.sucesso}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setEditando(false)}
          className="flex-1 rounded-xl border border-border/60 py-3 text-sm font-semibold text-muted hover:text-foreground"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-xl bg-gradient-to-br from-[#f2d675] via-[#d4af37] to-[#93731f] py-3 text-sm font-semibold text-black disabled:opacity-50"
        >
          {pending ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}
