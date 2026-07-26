"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const ITENS = [
  {
    id: "termos",
    titulo: "Termos de Uso.",
    descricao: (
      <>
        Você leu e concorda com as{" "}
        <a href="/termos" target="_blank" className="underline">
          regras de uso da plataforma
        </a>
        .
      </>
    ),
  },
  {
    id: "privacidade",
    titulo: "Política de Privacidade.",
    descricao: (
      <>
        Você entende como seus dados são tratados, conforme a{" "}
        <a href="/privacidade" target="_blank" className="underline">
          nossa política
        </a>
        .
      </>
    ),
  },
  {
    id: "riscos",
    titulo: "Ciência dos riscos.",
    descricao:
      "A rentabilidade é variável, não garantida, e pode ser nula ou negativa conforme o contrato adotado.",
  },
] as const;

export function TermosChecklist({
  action,
}: {
  action: () => void | Promise<void>;
}) {
  const [marcados, setMarcados] = useState<Record<string, boolean>>({});
  const todosMarcados = ITENS.every((item) => marcados[item.id]);

  return (
    <form action={action} className="mt-6">
      <ul className="space-y-3 text-sm text-foreground/90">
        {ITENS.map((item) => (
          <li key={item.id}>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-surface-2 p-4 transition hover:border-gold/40">
              <input
                type="checkbox"
                checked={marcados[item.id] ?? false}
                onChange={(e) =>
                  setMarcados((prev) => ({ ...prev, [item.id]: e.target.checked }))
                }
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border bg-surface accent-[#d4af37]"
              />
              <span>
                <strong className="text-gold-light">{item.titulo}</strong>{" "}
                {item.descricao}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <Button
        type="submit"
        variant="gold"
        className="mt-8 w-full"
        disabled={!todosMarcados}
      >
        Li e concordo — continuar
      </Button>
    </form>
  );
}
