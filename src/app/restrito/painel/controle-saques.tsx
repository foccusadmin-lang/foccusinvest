"use client";

import { useActionState, useState, useTransition } from "react";
import type { ModoProcessamento } from "@prisma/client";
import {
  definirModoSaque,
  definirValorMaximoAprovacaoAutomatica,
  definirAplicacaoBensAtiva,
} from "./config-actions";
import { MoneyInput } from "@/components/ui/money-input";
import { IconWallet, IconVerified, IconUsers, IconGift, IconPlus, IconPackage } from "@/components/icons";

type CampoConfig =
  | "modoSaqueCapital"
  | "modoSaqueRendimento"
  | "modoVerificacaoCadastro"
  | "modoIncentivoLideranca"
  | "modoBonusIndicacao"
  | "modoAprovacaoAporte";

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

function LimiteAporteInput({ valorAtual }: { valorAtual: number }) {
  const [state, action, pending] = useActionState(definirValorMaximoAprovacaoAutomatica, undefined);
  const [texto, setTexto] = useState(
    valorAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );

  return (
    <form action={action} className="flex items-center gap-2">
      <span className="text-sm text-muted">Teto pra liberar sozinho (R$):</span>
      <MoneyInput
        name="valorMaximo"
        value={texto}
        onValueChange={setTexto}
        className="w-28 rounded-lg border border-border bg-surface-2 px-2 py-1 text-sm text-foreground outline-none focus:border-gold/60"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-200 hover:bg-sky-500/30 disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
      {state?.error && <span className="text-xs text-red-400">{state.error}</span>}
      {state?.sucesso && <span className="text-xs text-emerald-400">{state.sucesso}</span>}
    </form>
  );
}

function ToggleAplicacaoBens({ ativa }: { ativa: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted">Modo:</span>
      <div className="flex rounded-lg border border-border bg-surface-2 p-0.5">
        <button
          disabled={isPending}
          onClick={() => startTransition(() => definirAplicacaoBensAtiva(true))}
          className={`rounded-md px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ${
            ativa ? "bg-gold text-black" : "text-muted hover:text-foreground"
          }`}
        >
          Ativado
        </button>
        <button
          disabled={isPending}
          onClick={() => startTransition(() => definirAplicacaoBensAtiva(false))}
          className={`rounded-md px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ${
            !ativa ? "bg-gold text-black" : "text-muted hover:text-foreground"
          }`}
        >
          Desativado
        </button>
      </div>
    </div>
  );
}

export function ControleSaques({
  modoSaqueCapital,
  modoSaqueRendimento,
  modoVerificacaoCadastro,
  modoIncentivoLideranca,
  modoBonusIndicacao,
  modoAprovacaoAporte,
  valorMaximoAprovacaoAutomatica,
  aplicacaoBensAtiva,
}: {
  modoSaqueCapital: ModoProcessamento;
  modoSaqueRendimento: ModoProcessamento;
  modoVerificacaoCadastro: ModoProcessamento;
  modoIncentivoLideranca: ModoProcessamento;
  modoBonusIndicacao: ModoProcessamento;
  modoAprovacaoAporte: ModoProcessamento;
  valorMaximoAprovacaoAutomatica: number;
  aplicacaoBensAtiva: boolean;
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

      <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
        <div className="flex items-center gap-2 text-sky-200">
          <IconPlus width={16} height={16} />
          <span className="text-sm font-semibold">Aprovação de Aportes</span>
        </div>
        <Toggle label="Modo" campo="modoAprovacaoAporte" valor={modoAprovacaoAporte} />
        {modoAprovacaoAporte === "AUTOMATICO" && (
          <LimiteAporteInput valorAtual={valorMaximoAprovacaoAutomatica} />
        )}
        <p className="w-full text-xs text-muted">
          Automático confirma o aporte via Pix na hora que o comprovante é enviado, liberando o
          valor na carteira do investidor instantaneamente — mas só até o teto configurado acima;
          acima disso, mesmo no automático, cai pra sua conferência manual em Aportes. No manual,
          todo aporte depende de você conferir o comprovante e clicar em "Aprovar". Aporte em bem
          (imóvel/automóvel/eletrônico) sempre exige sua avaliação manual, em qualquer modo.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 p-4">
        <div className="flex items-center gap-2 text-fuchsia-200">
          <IconPackage width={16} height={16} />
          <span className="text-sm font-semibold">Aplicação em Bens</span>
        </div>
        <ToggleAplicacaoBens ativa={aplicacaoBensAtiva} />
        <p className="w-full text-xs text-muted">
          Desativado esconde o formulário: o botão continua visível pro investidor, mas ao
          clicar aparece um aviso pedindo pra entrar em contato com o administrador. Não afeta
          aportes em bens já enviados ou em avaliação.
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

      <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-gold/30 bg-gold/10 p-4">
        <div className="flex items-center gap-2 text-gold-light">
          <IconUsers width={16} height={16} />
          <span className="text-sm font-semibold">Incentivo de Liderança</span>
        </div>
        <Toggle label="Modo" campo="modoIncentivoLideranca" valor={modoIncentivoLideranca} />
        <p className="text-xs text-muted">
          Automático libera 0,10% sobre o capital de todos os líderes, de segunda a sexta às
          19h. No manual, use o botão "% Liberar incentivo pra todos" na aba Liderança —
          inclusive pra lançar um dia esquecido, escolhendo a data.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 p-4">
        <div className="flex items-center gap-2 text-fuchsia-200">
          <IconGift width={16} height={16} />
          <span className="text-sm font-semibold">Bônus de Indicação</span>
        </div>
        <Toggle label="Modo" campo="modoBonusIndicacao" valor={modoBonusIndicacao} />
        <p className="text-xs text-muted">
          Automático libera 5% em toda nova aplicação do indicado (não só a primeira). No manual,
          só a primeira aplicação libera sozinha — as seguintes ficam disponíveis pro botão
          "Liberar bônus" em Aportes.
        </p>
      </div>
    </div>
  );
}
