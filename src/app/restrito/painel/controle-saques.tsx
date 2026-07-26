"use client";

import { useTransition } from "react";
import type { ModoProcessamento } from "@prisma/client";
import { definirModoSaque } from "./config-actions";
import { IconWallet, IconVerified } from "@/components/icons";

type CampoConfig = "modoSaqueCapital" | "modoSaqueRendimento" | "modoVerificacaoCadastro";

function Toggle({
  label,
  campo,
  valor,
}: {
  label: string;
  campo: CampoConfig;
  valor: ModoProcessamento;
}) {
  const [isPending, startTransition] = useTransition();

  const opcoes: ModoProcessamento[] = ["MANUAL", "AUTOMATICO"];

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted">{label}:</span>
      <div className="flex rounded-lg border border-border bg-surface-2 p-0.5">
        {opcoes.map((opcao) => (
          <button
            key={opcao}
            disabled={isPending}
            onClick={() => startTransition(() => definirModoSaque(campo, opcao))}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ${
              valor === opcao
                ? "bg-gold text-black"
                : "text-muted hover:text-foreground"
            }`}
          >
            {opcao === "MANUAL" ? "Manual" : "Automático"}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ControleSaques({
  modoSaqueCapital,
  modoSaqueRendimento,
  modoVerificacaoCadastro,
}: {
  modoSaqueCapital: ModoProcessamento;
  modoSaqueRendimento: ModoProcessamento;
  modoVerificacaoCadastro: ModoProcessamento;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4">
        <div className="flex items-center gap-2 text-violet-200">
          <IconWallet width={16} height={16} />
          <span className="text-sm font-semibold">Controle de Saques</span>
        </div>
        <Toggle label="Capital" campo="modoSaqueCapital" valor={modoSaqueCapital} />
        <Toggle label="Rendimento" campo="modoSaqueRendimento" valor={modoSaqueRendimento} />
        <p className="text-xs text-muted">
          Automático processa o saque na hora, sem revisão manual. Exige cadastro verificado.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <div className="flex items-center gap-2 text-emerald-200">
          <IconVerified width={16} height={16} />
          <span className="text-sm font-semibold">Verificação de Cadastro</span>
        </div>
        <Toggle
          label="Modo"
          campo="modoVerificacaoCadastro"
          valor={modoVerificacaoCadastro}
        />
        <p className="text-xs text-muted">
          Automático aprova o investidor assim que ele completa o cadastro, sem revisão manual.
        </p>
      </div>
    </div>
  );
}
