"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconPlus, IconArrowDown, IconRefresh, IconHeart } from "@/components/icons";
import { formatMoeda } from "@/lib/format";
import {
  criarAplicacao,
  solicitarSaqueCapital,
  solicitarSaqueRendimento,
  reaplicar,
  type AcaoState,
} from "@/app/painel/actions";

type TipoAcao = "aplicacao" | "saque-capital" | "saque-rendimento" | "reaplicar";

type AcaoConfig = {
  titulo: string;
  descricao: string;
  action: (state: AcaoState, formData: FormData) => Promise<AcaoState>;
  textoBotao: string;
};

const CONFIG: Record<TipoAcao, AcaoConfig> = {
  aplicacao: {
    titulo: "Nova aplicação",
    descricao:
      "Modo de desenvolvimento: sem integração de pagamento real ainda, a aplicação é confirmada automaticamente para fins de teste. Carência de 90 dias a partir de hoje.",
    action: criarAplicacao,
    textoBotao: "Confirmar aplicação",
  },
  "saque-capital": {
    titulo: "Saque de capital",
    descricao: "Disponível apenas para lotes que já concluíram a carência de 90 dias.",
    action: solicitarSaqueCapital,
    textoBotao: "Solicitar saque",
  },
  "saque-rendimento": {
    titulo: "Saque de rendimentos",
    descricao: "Disponível a partir do saldo de rendimentos já liberado.",
    action: solicitarSaqueRendimento,
    textoBotao: "Solicitar saque",
  },
  reaplicar: {
    titulo: "Reaplicar",
    descricao: "Reaplica rendimentos e bônus disponíveis. Valor mínimo de R$ 100,00.",
    action: reaplicar,
    textoBotao: "Reaplicar agora",
  },
};

const MINIMO_REAPLICACAO = 100;

export function AcoesRapidas({
  saldoParaReaplicar,
  janelaSaqueRendimentoAberta,
  verificado,
}: {
  saldoParaReaplicar: number;
  janelaSaqueRendimentoAberta: boolean;
  verificado: boolean;
}) {
  const [aberto, setAberto] = useState<TipoAcao | null>(null);
  const reaplicarDesativado = saldoParaReaplicar < MINIMO_REAPLICACAO;

  const saqueCapitalDesativado = !verificado;
  const saqueRendimentoDesativado = !verificado || !janelaSaqueRendimentoAberta;
  const dicaNaoVerificado =
    "Disponível após completar o cadastro e ser verificado pelo administrador";

  return (
    <>
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Button variant="gold" className="w-full" onClick={() => setAberto("aplicacao")}>
          <IconPlus width={16} height={16} /> Nova aplicação
        </Button>

        {saqueCapitalDesativado ? (
          <Button
            variant="outline"
            className="w-full cursor-not-allowed opacity-50"
            disabled
            title={dicaNaoVerificado}
          >
            <IconArrowDown width={16} height={16} /> Saque de capital
          </Button>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setAberto("saque-capital")}>
            <IconArrowDown width={16} height={16} /> Saque de capital
          </Button>
        )}

        {saqueRendimentoDesativado ? (
          <Button
            variant="outline"
            className="w-full cursor-not-allowed opacity-50"
            disabled
            title={!verificado ? dicaNaoVerificado : "Disponível às sextas-feiras, das 08h às 18h30"}
          >
            <IconArrowDown width={16} height={16} /> Saque de rendimentos
          </Button>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setAberto("saque-rendimento")}
          >
            <IconArrowDown width={16} height={16} /> Saque de rendimentos
          </Button>
        )}

        {reaplicarDesativado ? (
          <Button
            variant="outline"
            className="w-full cursor-not-allowed opacity-50"
            disabled
            title={`Disponível a partir de ${formatMoeda(MINIMO_REAPLICACAO)} em saldo`}
          >
            <IconRefresh width={16} height={16} /> Reaplicar
          </Button>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setAberto("reaplicar")}>
            <IconRefresh width={16} height={16} /> Reaplicar
          </Button>
        )}
      </section>

      <p className="mt-2 text-center text-xs text-muted sm:text-left">
        {!verificado && (
          <>Saques liberados após o cadastro ser verificado pelo administrador. </>
        )}
        Saque de rendimentos disponível às sextas-feiras, 08h-18h30 (horário de Brasília) · reaplicação
        liberada automaticamente ao acumular {formatMoeda(MINIMO_REAPLICACAO)}.
      </p>

      <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          variant="ghost"
          className="w-full cursor-not-allowed justify-start border border-border/60 opacity-60"
          disabled
        >
          <IconHeart width={16} height={16} /> Doar saldo disponível (em breve)
        </Button>
      </section>

      {aberto && <AcaoModal tipo={aberto} onClose={() => setAberto(null)} />}
    </>
  );
}

function AcaoModal({ tipo, onClose }: { tipo: TipoAcao; onClose: () => void }) {
  const cfg = CONFIG[tipo];
  const [state, action, pending] = useActionState(cfg.action, undefined);
  const router = useRouter();
  const processado = useRef(false);

  useEffect(() => {
    if (state?.sucesso && !processado.current) {
      processado.current = true;
      router.refresh();
      const timeout = setTimeout(onClose, 1800);
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
        className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-foreground">{cfg.titulo}</h3>
        <p className="mt-1 text-sm text-muted">{cfg.descricao}</p>

        {state?.sucesso ? (
          <p className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {state.sucesso}
          </p>
        ) : (
          <form action={action} className="mt-6 space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground/90">Valor (R$)</span>
              <input
                name="valor"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                required
                autoFocus
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
              />
            </label>

            {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1 border border-border/60"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="gold" className="flex-1" disabled={pending}>
                {pending ? "Enviando..." : cfg.textoBotao}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
