"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { MaskedInput } from "@/components/ui/masked-input";
import { completarCadastroPF, completarCadastroPJ } from "./actions";

function Field({
  label,
  name,
  type = "text",
  required = true,
  placeholder,
  defaultValue,
  mask,
}: {
  label: string;
  name: string;
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

export function CadastroForm() {
  const [tipo, setTipo] = useState<"FISICA" | "JURIDICA">("FISICA");
  const [pfState, pfAction, pfPending] = useActionState(completarCadastroPF, undefined);
  const [pjState, pjAction, pjPending] = useActionState(completarCadastroPJ, undefined);

  return (
    <div>
      <div className="mb-6 flex gap-2 rounded-xl border border-border bg-surface-2 p-1">
        <button
          type="button"
          onClick={() => setTipo("FISICA")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
            tipo === "FISICA" ? "bg-gold text-black" : "text-muted"
          }`}
        >
          Pessoa Física
        </button>
        <button
          type="button"
          onClick={() => setTipo("JURIDICA")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
            tipo === "JURIDICA" ? "bg-gold text-black" : "text-muted"
          }`}
        >
          Pessoa Jurídica
        </button>
      </div>

      {tipo === "FISICA" ? (
        <form action={pfAction} className="space-y-4">
          <Field label="Nome completo" name="nomeCompleto" />
          <Field label="E-mail" name="email" type="email" />
          <Field label="CPF" name="cpf" mask="cpf" />
          <Field label="Data de nascimento" name="dataNascimento" type="date" />
          <Field label="Telefone" name="telefone" mask="telefone" />
          <Field label="Endereço" name="endereco" required={false} />
          {pfState?.error && (
            <p className="text-sm text-red-400">{pfState.error}</p>
          )}
          <Button type="submit" variant="gold" className="w-full" disabled={pfPending}>
            {pfPending ? "Enviando..." : "Concluir cadastro"}
          </Button>
        </form>
      ) : (
        <form action={pjAction} className="space-y-4">
          <Field label="Razão social" name="razaoSocial" />
          <Field label="Nome fantasia" name="nomeFantasia" required={false} />
          <Field label="E-mail" name="email" type="email" />
          <Field label="CNPJ" name="cnpj" mask="cnpj" />
          <Field label="Representante legal" name="representanteLegal" />
          <Field label="CPF do representante" name="cpfRepresentante" mask="cpf" />
          <Field label="Telefone" name="telefone" mask="telefone" />
          <Field label="Endereço" name="endereco" required={false} />
          {pjState?.error && (
            <p className="text-sm text-red-400">{pjState.error}</p>
          )}
          <Button type="submit" variant="gold" className="w-full" disabled={pjPending}>
            {pjPending ? "Enviando..." : "Concluir cadastro"}
          </Button>
        </form>
      )}
    </div>
  );
}
