"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { importarMigracaoCsv } from "./actions";

export function MigracaoForm() {
  const [state, action, pending] = useActionState(importarMigracaoCsv, undefined);

  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-foreground/90">
          Arquivo CSV (nome, documento, e-mail, valor)
        </span>
        <input
          name="arquivo"
          type="file"
          accept=".csv,text/csv"
          required
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none file:mr-3 file:rounded-md file:border-0 file:bg-gold/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-gold-light"
        />
        <span className="mt-1 block text-xs text-muted">
          Uma linha por cliente: <code>nome,documento,email,valor</code> — ex:{" "}
          <code>João da Silva,52998224725,joao@email.com,55300.00</code>. Cabeçalho é opcional
          (nesse caso a ordem das colunas não importa). Documento e e-mail podem vir vazios.
          Nenhum valor é creditado sozinho: todo lançamento cai numa lista de aprovação pra você
          conferir nome e valor antes de clicar em Aprovar. Sem CPF, o e-mail é usado pra achar a
          conta automaticamente (útil para investidores antigos com nome corrompido na planilha);
          sem achar ninguém, fica marcado para lançamento manual com o e-mail já preenchido.
        </span>
      </label>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state?.sucesso && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          {state.sucesso}
        </p>
      )}

      <Button type="submit" variant="gold" className="w-full sm:w-auto" disabled={pending}>
        {pending ? "Importando..." : "Importar planilha"}
      </Button>
    </form>
  );
}
