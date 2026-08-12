"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, LinkButton } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";
import { IconPlus, IconArrowDown, IconRefresh, IconHeart, IconAlert, IconUsers } from "@/components/icons";
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
import {
  DESCONTO_RENDIMENTO_EMERGENCIAL,
  estimarSaqueEmergencial,
} from "@/lib/emergencia-calculo";
import type { LiberacaoAtiva } from "@/lib/emergencia";

type TipoAcao =
  | "aplicacao"
  | "saque-capital"
  | "saque-rendimento"
  | "reaplicar"
  | "saque-emergencia"
  | "painel-lider";
type TipoAcaoSimples = "saque-capital" | "saque-rendimento" | "reaplicar";

export type IndicadoDireto = {
  id: string;
  nome: string;
  email: string;
  statusCadastro: string;
  criadoEm: Date;
};

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
  rendimentoDisponivel,
  distribuicoesAcumuladas,
  proximaLiberacao,
  moeda = "BRL",
  liberacaoEmergencial,
  codigoIndicacao,
  primeiroAporteElegivelIndicacao,
  ehLider,
  indicadosDiretos,
}: {
  saldoParaReaplicar: number;
  janelaSaqueRendimentoAberta: boolean;
  verificado: boolean;
  capitalPrincipal: number;
  capitalDisponivel: number;
  capitalCarencia: number;
  rendimentoDisponivel: number;
  distribuicoesAcumuladas: number;
  proximaLiberacao: Date | null;
  moeda?: "BRL" | "USD" | "USDT";
  liberacaoEmergencial: LiberacaoAtiva | null;
  codigoIndicacao: string | null;
  primeiroAporteElegivelIndicacao: boolean;
  ehLider: boolean;
  indicadosDiretos: IndicadoDireto[];
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
        <LinkButton
          href="/painel/doar"
          variant="ghost"
          className="w-full justify-start border border-border/60"
        >
          <IconHeart width={16} height={16} /> Doar para uma entidade
        </LinkButton>

        {liberacaoEmergencial ? (
          <Button
            variant="ghost"
            className="w-full justify-start border border-red-500/40 text-red-300 hover:bg-red-500/10"
            onClick={() => setAberto("saque-emergencia")}
          >
            <IconAlert width={16} height={16} /> Solicitar saque emergencial
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="w-full cursor-not-allowed justify-start border border-border/60 opacity-60"
            disabled
            title="Esta aplicação ainda está no período de carência. Para solicitar um saque emergencial, entre em contato com a administração."
          >
            <IconAlert width={16} height={16} /> Saque de emergência (bloqueado)
          </Button>
        )}

        {ehLider && (
          <Button
            variant="ghost"
            className="w-full justify-start border border-gold/40 text-gold-light hover:bg-gold/10"
            onClick={() => setAberto("painel-lider")}
          >
            <IconUsers width={16} height={16} /> Painel de Líder
          </Button>
        )}
      </section>

      {aberto === "aplicacao" && (
        <NovaAplicacaoModal
          onClose={() => setAberto(null)}
          capitalPrincipal={capitalPrincipal}
          distribuicoesAcumuladas={distribuicoesAcumuladas}
          moeda={moeda}
          codigoIndicacao={codigoIndicacao}
          primeiroAporteElegivelIndicacao={primeiroAporteElegivelIndicacao}
        />
      )}
      {aberto === "saque-emergencia" && liberacaoEmergencial && (
        <SaqueEmergenciaModal
          onClose={() => setAberto(null)}
          liberacao={liberacaoEmergencial}
          rendimentoDisponivel={rendimentoDisponivel}
          moeda={moeda}
        />
      )}
      {aberto === "painel-lider" && (
        <PainelLiderModal onClose={() => setAberto(null)} indicados={indicadosDiretos} />
      )}
      {aberto &&
        aberto !== "aplicacao" &&
        aberto !== "saque-emergencia" &&
        aberto !== "painel-lider" && (
          <AcaoModal
            tipo={aberto}
            onClose={() => setAberto(null)}
            capitalDisponivel={capitalDisponivel}
            capitalCarencia={capitalCarencia}
            rendimentoDisponivel={rendimentoDisponivel}
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
  codigoIndicacao,
  primeiroAporteElegivelIndicacao,
}: {
  onClose: () => void;
  capitalPrincipal: number;
  distribuicoesAcumuladas: number;
  moeda: "BRL" | "USD" | "USDT";
  codigoIndicacao: string | null;
  primeiroAporteElegivelIndicacao: boolean;
}) {
  const [state, action, pending] = useActionState(criarAplicacao, undefined);
  const [etapa, setEtapa] = useState<"valor" | "pagamento">("valor");
  const [valorTexto, setValorTexto] = useState("");
  const [codigoIndicador, setCodigoIndicador] = useState("");
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
                <MoneyInput
                  value={valorTexto}
                  onValueChange={setValorTexto}
                  placeholder="0,00"
                  autoFocus
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
                />
              </label>

              {codigoIndicacao && (
                <p className="text-xs text-muted">
                  Seu código de indicação: <span className="font-semibold text-gold-light">{codigoIndicacao}</span>
                </p>
              )}
              {primeiroAporteElegivelIndicacao && (
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-foreground/90">
                    Código de quem te indicou (opcional)
                  </span>
                  <input
                    value={codigoIndicador}
                    onChange={(e) => setCodigoIndicador(e.target.value.toUpperCase())}
                    type="text"
                    placeholder="Ex: 7K2QX-WALDIR"
                    className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 uppercase text-foreground outline-none focus:border-gold/60"
                  />
                  <span className="mt-1 block text-xs text-muted">
                    Se alguém te indicou, coloca o código dessa pessoa aqui pra ela ganhar 5% desse
                    aporte. Só vale no seu primeiro aporte.
                  </span>
                </label>
              )}

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
              <input type="hidden" name="codigoIndicador" value={codigoIndicador} />
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

function SaqueEmergenciaModal({
  onClose,
  liberacao,
  rendimentoDisponivel,
  moeda,
}: {
  onClose: () => void;
  liberacao: LiberacaoAtiva;
  rendimentoDisponivel: number;
  moeda: "BRL" | "USD" | "USDT";
}) {
  const [state, action, pending] = useActionState(solicitarSaqueEmergencia, undefined);
  const [valorTexto, setValorTexto] = useState(liberacao.valorMaximo.toFixed(2).replace(".", ","));
  const [incluirRendimento, setIncluirRendimento] = useState(false);
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

  const capitalSolicitado = Number(valorTexto.replace(/\./g, "").replace(",", ".")) || 0;
  const passaDoMaximo = capitalSolicitado > liberacao.valorMaximo;
  const estimativa = estimarSaqueEmergencial(
    capitalSolicitado,
    rendimentoDisponivel,
    incluirRendimento,
    new Date(liberacao.aplicacao.criadoEm)
  );

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
          Liberado pelo administrador — motivo: "{liberacao.motivo}". Válido até{" "}
          {formatData(new Date(liberacao.expiraEm))}.
        </p>

        <div className="mt-4 rounded-xl border border-border bg-surface-2 p-3">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted">Máximo autorizado</p>
              <p className="text-sm font-semibold text-emerald-300">
                {formatMoeda(liberacao.valorMaximo, moeda)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted">Saldo da aplicação</p>
              <p className="text-sm font-semibold text-foreground">
                {formatMoeda(liberacao.aplicacao.valor, moeda)}
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
            <input type="hidden" name="incluirRendimento" value={incluirRendimento ? "1" : "0"} />

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground/90">
                Valor do capital a sacar
              </span>
              <MoneyInput
                name="valor"
                value={valorTexto}
                onValueChange={setValorTexto}
                placeholder="0,00"
                required
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-red-400/60"
              />
              <span className="mt-1 block text-xs text-muted">
                Máximo autorizado: {formatMoeda(liberacao.valorMaximo)}
              </span>
            </label>

            {rendimentoDisponivel > 0 && (
              <label className="flex items-start gap-2 rounded-lg border border-border bg-surface-2 p-3 text-xs">
                <input
                  type="checkbox"
                  checked={incluirRendimento}
                  onChange={(e) => setIncluirRendimento(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Incluir também o rendimento disponível ({formatMoeda(rendimentoDisponivel)}) —
                  sofre desconto de 15% + IOF regressivo.
                </span>
              </label>
            )}

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
              <div className="flex justify-between text-muted">
                <span>Valor do capital</span>
                <span className="text-foreground">{formatMoeda(estimativa.capitalSolicitado)}</span>
              </div>
              {incluirRendimento && (
                <>
                  <div className="mt-1 flex justify-between text-muted">
                    <span>Valor do rendimento</span>
                    <span className="text-foreground">{formatMoeda(estimativa.rendimentoBruto)}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-amber-300">
                    <span>Desconto sobre rendimento (15%)</span>
                    <span>-{formatMoeda(estimativa.descontoRendimento)}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-amber-300">
                    <span>IOF ({estimativa.aliquotaIOF}%, dia {estimativa.diasCorridos})</span>
                    <span>-{formatMoeda(estimativa.iof)}</span>
                  </div>
                </>
              )}
              <div className="mt-1 flex justify-between border-t border-amber-500/20 pt-1 font-semibold text-emerald-300">
                <span>Valor líquido estimado</span>
                <span>{formatMoeda(estimativa.valorLiquido)}</span>
              </div>
            </div>

            {passaDoMaximo && (
              <p className="text-sm text-red-400">
                O valor não pode passar do máximo autorizado ({formatMoeda(liberacao.valorMaximo)}).
              </p>
            )}

            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
              Atenção: essa operação ignora a carência dessa aplicação. A liberação vale só uma
              vez e é encerrada automaticamente depois deste saque.
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
                disabled={pending || passaDoMaximo || capitalSolicitado <= 0}
                className="flex-1 rounded-xl bg-red-500/90 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {pending ? "Processando..." : "Confirmar solicitação"}
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
  rendimentoDisponivel,
  proximaLiberacao,
  moeda,
  saldoParaReaplicar,
}: {
  tipo: TipoAcaoSimples;
  onClose: () => void;
  capitalDisponivel: number;
  capitalCarencia: number;
  rendimentoDisponivel: number;
  proximaLiberacao: Date | null;
  moeda: "BRL" | "USD" | "USDT";
  saldoParaReaplicar: number;
}) {
  const cfg = CONFIG[tipo];
  const [state, action, pending] = useActionState(cfg.action, undefined);
  const [valorTexto, setValorTexto] = useState("");
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

  const maximo =
    tipo === "saque-capital"
      ? capitalDisponivel
      : tipo === "saque-rendimento"
        ? rendimentoDisponivel
        : saldoParaReaplicar;

  function preencherMaximo() {
    setValorTexto(
      maximo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
  }

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

        {tipo === "saque-rendimento" && (
          <div className="mt-4 rounded-xl border border-border bg-surface-2 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted">Saldo disponível</p>
            <p className="text-sm font-semibold text-emerald-300">
              {formatMoeda(rendimentoDisponivel, moeda)}
            </p>
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
              <div className="flex gap-2">
                <MoneyInput
                  name="valor"
                  value={valorTexto}
                  onValueChange={setValorTexto}
                  placeholder="0,00"
                  required
                  autoFocus
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
                />
                <button
                  type="button"
                  onClick={preencherMaximo}
                  className="shrink-0 rounded-lg bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/25"
                >
                  Máximo
                </button>
              </div>
            </label>

            {(tipo === "saque-capital" || tipo === "saque-rendimento") && (
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-foreground/90">Chave Pix</span>
                <input
                  name="chavePix"
                  type="text"
                  placeholder="CPF, e-mail, telefone ou chave aleatória"
                  required
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
                />
              </label>
            )}

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

const STATUS_INDICADO: Record<string, { label: string; className: string }> = {
  INCOMPLETO: { label: "Cadastro incompleto", className: "bg-white/10 text-muted" },
  PENDENTE: { label: "Em análise", className: "bg-sky-500/15 text-sky-300" },
  APROVADO: { label: "Verificado", className: "bg-emerald-500/15 text-emerald-300" },
  SUSPENSO: { label: "Suspenso", className: "bg-red-500/15 text-red-300" },
  REJEITADO: { label: "Rejeitado", className: "bg-red-500/15 text-red-300" },
};

function PainelLiderModal({
  onClose,
  indicados,
}: {
  onClose: () => void;
  indicados: IndicadoDireto[];
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gold/40 bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gold-light">
          <IconUsers width={18} height={18} /> Painel de Líder
        </h3>
        <p className="mt-1 text-sm text-muted">
          Pessoas que se cadastraram usando o seu código de indicação diretamente, ou que o
          administrador adicionou como indicadas por você.
        </p>

        <div className="mt-4 rounded-lg border border-gold/30 bg-gold/10 p-3 text-xs text-gold-light">
          Como líder, você recebe um incentivo de liderança de 0,10% ao dia sobre seu capital,
          além da rentabilidade diária normal — aparece no seu histórico como "Incentivo de
          liderança".
        </div>

        {indicados.length === 0 ? (
          <p className="mt-4 rounded-lg border border-border bg-surface-2 p-4 text-center text-sm text-muted">
            Ninguém se cadastrou com o seu código ainda.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {indicados.map((i) => {
              const status = STATUS_INDICADO[i.statusCadastro] ?? {
                label: i.statusCadastro,
                className: "bg-white/10 text-muted",
              };
              return (
                <div
                  key={i.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{i.nome}</p>
                    <p className="truncate text-xs text-muted">{i.email}</p>
                    <p className="text-[10px] text-muted">Desde {formatData(i.criadoEm)}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl border border-border/60 py-3 text-sm font-semibold text-muted hover:text-foreground"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
