"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconPlus, IconArrowDown, IconRefresh, IconHeart, IconAlert } from "@/components/icons";
import { formatMoeda, formatData } from "@/lib/format";
import { PIX_CHAVE, PIX_TIPO_CHAVE, PIX_BENEFICIARIO } from "@/lib/config";
import {
  criarAplicacao,
  solicitarSaqueCapital,
  solicitarSaqueRendimento,
  solicitarSaqueEmergencia,
  reaplicar,
  type AcaoState,
} from "@/app/painel/actions";

const TAXA_ANTECIPACAO_EXIBICAO = 0.05;

type TipoAcao = "aplicacao" | "saque-capital" | "saque-rendimento" | "reaplicar" | "saque-emergencia";
type TipoAcaoSimples = "saque-capital" | "saque-rendimento" | "reaplicar";

type AcaoConfig = {
  titulo: string;
  descricao: string;
  action: (state: AcaoState, formData: FormData) => Promise<AcaoState>;
  textoBotao: string;
};

const CONFIG: Record<TipoAcaoSimples, AcaoConfig> = {
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
  capitalPrincipal,
  capitalDisponivel,
  capitalCarencia,
  distribuicoesAcumuladas,
  proximaLiberacao,
  moeda = "BRL",
  saqueEmergencialLiberado,
}: {
  saldoParaReaplicar: number;
  janelaSaqueRendimentoAberta: boolean;
  verificado: boolean;
  capitalPrincipal: number;
  capitalDisponivel: number;
  capitalCarencia: number;
  distribuicoesAcumuladas: number;
  proximaLiberacao: Date | null;
  moeda?: "BRL" | "USD" | "USDT";
  saqueEmergencialLiberado: boolean;
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

        {saqueEmergencialLiberado ? (
          <Button
            variant="ghost"
            className="w-full justify-start border border-red-500/40 text-red-300 hover:bg-red-500/10"
            onClick={() => setAberto("saque-emergencia")}
          >
            <IconAlert width={16} height={16} /> Saque de emergência
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="w-full cursor-not-allowed justify-start border border-border/60 opacity-60"
            disabled
            title="Fale com o administrador para liberar o saque de emergência para sua conta"
          >
            <IconAlert width={16} height={16} /> Saque de emergência (bloqueado)
          </Button>
        )}
      </section>

      {aberto === "aplicacao" && (
        <NovaAplicacaoModal
          onClose={() => setAberto(null)}
          capitalPrincipal={capitalPrincipal}
          distribuicoesAcumuladas={distribuicoesAcumuladas}
          moeda={moeda}
        />
      )}
      {aberto === "saque-emergencia" && (
        <SaqueEmergenciaModal
          onClose={() => setAberto(null)}
          capitalDisponivel={capitalDisponivel}
          capitalCarencia={capitalCarencia}
          moeda={moeda}
        />
      )}
      {aberto && aberto !== "aplicacao" && aberto !== "saque-emergencia" && (
        <AcaoModal
          tipo={aberto}
          onClose={() => setAberto(null)}
          capitalDisponivel={capitalDisponivel}
          capitalCarencia={capitalCarencia}
          proximaLiberacao={proximaLiberacao}
          moeda={moeda}
          saldoParaReaplicar={saldoParaReaplicar}
        />
      )}
    </>
  );
}

function NovaAplicacaoModal({
  onClose,
  capitalPrincipal,
  distribuicoesAcumuladas,
  moeda,
}: {
  onClose: () => void;
  capitalPrincipal: number;
  distribuicoesAcumuladas: number;
  moeda: "BRL" | "USD" | "USDT";
}) {
  const [state, action, pending] = useActionState(criarAplicacao, undefined);
  const [etapa, setEtapa] = useState<"valor" | "pagamento">("valor");
  const [valorTexto, setValorTexto] = useState("");
  const [copiado, setCopiado] = useState(false);
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

  function copiarChavePix() {
    navigator.clipboard.writeText(PIX_CHAVE).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  const valorNumerico = Number(valorTexto.replace(/\./g, "").replace(",", ".")) || 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-foreground">Nova aplicação</h3>

        {state?.sucesso ? (
          <p className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {state.sucesso}
          </p>
        ) : etapa === "valor" ? (
          <>
            <p className="mt-1 text-sm text-muted">
              Informe o valor que você quer aplicar. Mínimo de R$ 50,00.
            </p>

            <div className="mt-4 rounded-xl border border-border bg-surface-2 p-3">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted">
                    Capital atual
                  </p>
                  <p className="text-sm font-semibold text-emerald-300">
                    {formatMoeda(capitalPrincipal, moeda)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted">
                    Rendimento creditado
                  </p>
                  <p className="text-sm font-semibold text-gold-light">
                    {formatMoeda(distribuicoesAcumuladas, moeda)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-foreground/90">Valor (R$)</span>
                <input
                  value={valorTexto}
                  onChange={(e) => setValorTexto(e.target.value)}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  autoFocus
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
                />
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1 border border-border/60"
                  onClick={onClose}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="gold"
                  className="flex-1"
                  disabled={!valorTexto.trim() || valorNumerico < 50}
                  onClick={() => setEtapa("pagamento")}
                >
                  Continuar
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">
              Pague via Pix e envie o comprovante. Assim que o admin confirmar, o valor entra na
              sua carteira com carência de 90 dias. O contrato de prestação de serviços é enviado
              automaticamente para o seu e-mail.
            </p>

            <div className="mt-4 rounded-xl border border-gold/30 bg-surface-2 p-4">
              <p className="text-xs text-muted">Valor a pagar</p>
              <p className="text-lg font-bold text-gold-light">{formatMoeda(valorNumerico)}</p>
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-xs text-muted">Chave Pix ({PIX_TIPO_CHAVE})</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg bg-black/30 px-2 py-1.5 text-sm text-foreground">
                    {PIX_CHAVE}
                  </code>
                  <button
                    type="button"
                    onClick={copiarChavePix}
                    className="shrink-0 rounded-lg bg-gold/20 px-3 py-1.5 text-xs font-semibold text-gold-light hover:bg-gold/30"
                  >
                    {copiado ? "Copiado!" : "Copiar"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted">Beneficiário: {PIX_BENEFICIARIO}</p>
              </div>
            </div>

            <form action={action} className="mt-4 space-y-4">
              <input type="hidden" name="valor" value={valorTexto} />
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-foreground/90">
                  Comprovante do pagamento
                </span>
                <input
                  name="comprovante"
                  type="file"
                  accept=".pdf,image/*"
                  required
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none file:mr-3 file:rounded-md file:border-0 file:bg-gold/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-gold-light"
                />
              </label>

              {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1 border border-border/60"
                  onClick={() => setEtapa("valor")}
                >
                  Voltar
                </Button>
                <Button type="submit" variant="gold" className="flex-1" disabled={pending}>
                  {pending ? "Enviando..." : "Enviar comprovante"}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const ORIGENS_EMERGENCIA = [
  { valor: "CAPITAL", label: "Capital Principal", temTaxa: true },
  { valor: "DISPONIVEL", label: "Disponível p/ Saque", temTaxa: false },
  { valor: "RENDIMENTO", label: "PLR Acumulado", temTaxa: false },
  { valor: "BONUS", label: "Bônus de Indicação", temTaxa: false },
] as const;

function SaqueEmergenciaModal({
  onClose,
  capitalDisponivel,
  capitalCarencia,
  moeda,
}: {
  onClose: () => void;
  capitalDisponivel: number;
  capitalCarencia: number;
  moeda: "BRL" | "USD" | "USDT";
}) {
  const [state, action, pending] = useActionState(solicitarSaqueEmergencia, undefined);
  const [origem, setOrigem] = useState<(typeof ORIGENS_EMERGENCIA)[number]["valor"]>("CAPITAL");
  const [valorTexto, setValorTexto] = useState("");
  const router = useRouter();
  const processado = useRef(false);

  useEffect(() => {
    if (state?.sucesso && !processado.current) {
      processado.current = true;
      router.refresh();
      const timeout = setTimeout(onClose, 3200);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const valorBruto = Number(valorTexto.replace(/\./g, "").replace(",", ".")) || 0;
  const origemConfig = ORIGENS_EMERGENCIA.find((o) => o.valor === origem)!;
  const taxaAntecipacao = origemConfig.temTaxa ? valorBruto * TAXA_ANTECIPACAO_EXIBICAO : 0;
  const valorLiquido = valorBruto - taxaAntecipacao;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-red-500/40 bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="flex items-center gap-2 text-lg font-semibold text-red-300">
          <IconAlert width={18} height={18} /> Saque de emergência
        </h3>
        <p className="mt-1 text-sm text-muted">
          Ignora a carência de 90 dias e o calendário normal de saques. O motivo fica registrado
          para auditoria.
        </p>

        <div className="mt-4 rounded-xl border border-border bg-surface-2 p-3">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted">Disponível</p>
              <p className="text-sm font-semibold text-emerald-300">
                {formatMoeda(capitalDisponivel, moeda)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted">Em carência</p>
              <p className="text-sm font-semibold text-amber-300">
                {formatMoeda(capitalCarencia, moeda)}
              </p>
            </div>
          </div>
        </div>

        {state?.sucesso ? (
          <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {state.sucesso}
          </p>
        ) : (
          <form action={action} className="mt-4 space-y-4">
            <input type="hidden" name="origem" value={origem} />

            <div>
              <span className="mb-1 block text-sm font-medium text-foreground/90">
                Origem do saque
              </span>
              <div className="grid grid-cols-2 gap-2">
                {ORIGENS_EMERGENCIA.map((o) => (
                  <button
                    key={o.valor}
                    type="button"
                    onClick={() => setOrigem(o.valor)}
                    className={`rounded-lg py-2 text-xs font-semibold transition ${
                      origem === o.valor
                        ? "bg-red-500/20 text-red-300"
                        : "bg-white/5 text-muted hover:bg-white/10"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground/90">Valor (R$)</span>
              <input
                name="valor"
                value={valorTexto}
                onChange={(e) => setValorTexto(e.target.value)}
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                required
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-red-400/60"
              />
            </label>

            {origemConfig.temTaxa && valorBruto > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                <div className="flex justify-between text-muted">
                  <span>Valor bruto</span>
                  <span className="text-foreground">{formatMoeda(valorBruto)}</span>
                </div>
                <div className="mt-1 flex justify-between text-amber-300">
                  <span>Taxa de Antecipação (5%)</span>
                  <span>-{formatMoeda(taxaAntecipacao)}</span>
                </div>
                <div className="mt-1 flex justify-between border-t border-amber-500/20 pt-1 font-semibold text-emerald-300">
                  <span>Você recebe</span>
                  <span>{formatMoeda(valorLiquido)}</span>
                </div>
              </div>
            )}

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground/90">
                Motivo da emergência (obrigatório)
              </span>
              <textarea
                name="motivo"
                required
                minLength={10}
                rows={3}
                placeholder="Descreva o motivo (ex: emergência médica, situação familiar urgente...)"
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-red-400/60"
              />
            </label>

            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
              Atenção: essa operação ignora a carência de 90 dias e o calendário normal de
              saques. O motivo informado fica registrado para auditoria interna.
            </div>

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
              <button
                type="submit"
                disabled={pending}
                className="flex-1 rounded-xl bg-red-500/90 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {pending ? "Processando..." : "Executar saque"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function AcaoModal({
  tipo,
  onClose,
  capitalDisponivel,
  capitalCarencia,
  proximaLiberacao,
  moeda,
  saldoParaReaplicar,
}: {
  tipo: TipoAcaoSimples;
  onClose: () => void;
  capitalDisponivel: number;
  capitalCarencia: number;
  proximaLiberacao: Date | null;
  moeda: "BRL" | "USD" | "USDT";
  saldoParaReaplicar: number;
}) {
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

        {tipo === "saque-capital" && (
          <div className="mt-4 rounded-xl border border-border bg-surface-2 p-3">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted">
                  Disponível p/ saque
                </p>
                <p className="text-sm font-semibold text-emerald-300">
                  {formatMoeda(capitalDisponivel, moeda)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted">Em carência</p>
                <p className="text-sm font-semibold text-amber-300">
                  {formatMoeda(capitalCarencia, moeda)}
                </p>
              </div>
            </div>
            {capitalCarencia > 0 && proximaLiberacao && (
              <p className="mt-2 text-center text-[11px] text-muted">
                Próxima liberação de carência em {formatData(proximaLiberacao)}
              </p>
            )}
          </div>
        )}

        {tipo === "reaplicar" && (
          <div className="mt-4 rounded-xl border border-border bg-surface-2 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted">
              Disponível para reaplicar
            </p>
            <p className="text-sm font-semibold text-emerald-300">
              {formatMoeda(saldoParaReaplicar, moeda)}
            </p>
          </div>
        )}

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
