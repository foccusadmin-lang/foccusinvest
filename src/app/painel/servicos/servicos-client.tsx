"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { formatMoeda } from "@/lib/format";
import { IconWhatsapp, IconUsers, IconPackage } from "@/components/icons";
import {
  calcularContratacaoIndividual,
  calcularPacoteCompleto,
  centavosParaReais,
  montarMensagemWhatsapp,
  linkWhatsapp,
  CARTEIRA_DESTINO_NOME,
  CARTEIRA_DESTINO_CODIGO,
  VALOR_PACOTE_MENSAL_CENTAVOS,
  VALOR_PACOTE_ANUAL_CENTAVOS,
  DESCONTO_PACOTE_MENSAL_CENTAVOS,
  SUBTOTAL_PACOTE_CENTAVOS,
  type ResumoCobranca,
} from "@/lib/servicos";
import { contratarServicoAction, desativarServicoAction, type ContratacaoState } from "./actions";
import type { CodigoServico, FormaContratacaoServico, StatusServicoUsuario } from "@prisma/client";

export type ServicoComStatusClient = {
  servicoId: string;
  codigo: CodigoServico;
  nome: string;
  descricao: string;
  tarifaCentavos: number;
  contatoWhatsapp: string | null;
  mensagemPadrao: string | null;
  status: StatusServicoUsuario;
  formaContratacao: FormaContratacaoServico | null;
  contratadoEm: Date | null;
  ativadoEm: Date | null;
  desativadoEm: Date | null;
};

const STATUS_BADGE: Record<StatusServicoUsuario, { label: string; className: string }> = {
  DISPONIVEL: { label: "Disponível", className: "bg-surface-2 text-muted" },
  SELECIONADO: { label: "Selecionado", className: "bg-sky-500/15 text-sky-300" },
  AGUARDANDO_CONFIRMACAO: { label: "Aguardando confirmação", className: "bg-amber-500/15 text-amber-300" },
  PAGAMENTO_PENDENTE: { label: "Pagamento pendente", className: "bg-amber-500/15 text-amber-300" },
  CONTRATADO: { label: "Contratado", className: "bg-sky-500/15 text-sky-300" },
  CONTRATADO_AGUARDANDO_ELEGIBILIDADE: {
    label: "Contratado — aguardando elegibilidade",
    className: "bg-amber-500/15 text-amber-300",
  },
  ATIVO: { label: "Ativo", className: "bg-emerald-500/15 text-emerald-300" },
  INATIVO: { label: "Inativo", className: "bg-surface-2 text-muted" },
  DESATIVACAO_AGENDADA: { label: "Desativação agendada", className: "bg-amber-500/15 text-amber-300" },
  BLOQUEADO: { label: "Bloqueado", className: "bg-red-500/15 text-red-300" },
  SUSPENSO: { label: "Suspenso", className: "bg-red-500/15 text-red-300" },
  CANCELADO: { label: "Cancelado", className: "bg-surface-2 text-muted" },
  PAGAMENTO_RECUSADO: { label: "Pagamento recusado", className: "bg-red-500/15 text-red-300" },
  ERRO_PAGAMENTO: { label: "Erro no pagamento", className: "bg-red-500/15 text-red-300" },
};

const STATUS_BLOQUEIAM_SELECAO: StatusServicoUsuario[] = [
  "ATIVO",
  "CONTRATADO",
  "CONTRATADO_AGUARDANDO_ELEGIBILIDADE",
  "PAGAMENTO_PENDENTE",
  "AGUARDANDO_CONFIRMACAO",
];

type ModalContratacao =
  | { tipo: "individual" | "pacote_mensal" | "pacote_anual"; resumo: ResumoCobranca; forma: FormaContratacaoServico }
  | null;

export function ServicosClient({
  catalogo,
  primeiroNome,
  diretosAtivos,
  metaLideranca,
}: {
  catalogo: ServicoComStatusClient[];
  primeiroNome: string;
  diretosAtivos: number;
  metaLideranca: number;
}) {
  const [selecionados, setSelecionados] = useState<Set<CodigoServico>>(new Set());
  const [modal, setModal] = useState<ModalContratacao>(null);
  const [desativarAlvo, setDesativarAlvo] = useState<ServicoComStatusClient | null>(null);
  const router = useRouter();

  function alternarSelecao(codigo: CodigoServico) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(codigo)) novo.delete(codigo);
      else novo.add(codigo);
      return novo;
    });
  }

  const algumJaContratado = catalogo.some((s) => STATUS_BLOQUEIAM_SELECAO.includes(s.status));
  const listaSelecionados = Array.from(selecionados);
  const resumoSelecionados = useMemo(
    () => (listaSelecionados.length > 0 ? calcularContratacaoIndividual(listaSelecionados) : null),
    [listaSelecionados]
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/80 bg-ink/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo size={30} />
          <Link href="/painel" className="text-sm text-muted hover:text-gold-light">
            Voltar ao painel
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex items-center gap-2">
          <IconPackage width={22} height={22} className="text-gold-light" />
          <h1 className="text-2xl font-bold text-foreground">Pacotes de Serviços</h1>
        </div>
        <p className="mt-1 text-sm text-muted">
          Contrate serviços individualmente ou o pacote completo (com desconto). Enquanto não
          contratado, cada serviço fica oculto/bloqueado no restante da conta.
        </p>

        {/* Pacote completo */}
        <div className="mt-6 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-light">
            Pacote completo — todos os 8 serviços
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs text-muted">Mensal</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {formatMoeda(centavosParaReais(VALOR_PACOTE_MENSAL_CENTAVOS))}
              </p>
              <p className="mt-1 text-xs text-muted">
                Subtotal {formatMoeda(centavosParaReais(SUBTOTAL_PACOTE_CENTAVOS))} · desconto de 5% (
                {formatMoeda(centavosParaReais(DESCONTO_PACOTE_MENSAL_CENTAVOS))})
              </p>
              <button
                type="button"
                disabled={algumJaContratado}
                onClick={() =>
                  setModal({ tipo: "pacote_mensal", resumo: calcularPacoteCompleto("PACOTE_MENSAL"), forma: "PACOTE_MENSAL" })
                }
                className="mt-3 w-full rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Contratar pacote mensal
              </button>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs text-muted">Anual</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {formatMoeda(centavosParaReais(VALOR_PACOTE_ANUAL_CENTAVOS))}
              </p>
              <p className="mt-1 text-xs text-muted">Economia de R$ 50,00 em relação a 12 mensalidades</p>
              <button
                type="button"
                disabled={algumJaContratado}
                onClick={() =>
                  setModal({ tipo: "pacote_anual", resumo: calcularPacoteCompleto("PACOTE_ANUAL"), forma: "PACOTE_ANUAL" })
                }
                className="mt-3 w-full rounded-lg border border-gold/50 bg-transparent px-4 py-2 text-sm font-semibold text-gold-light hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Contratar pacote anual
              </button>
            </div>
          </div>
          {algumJaContratado && (
            <p className="mt-3 text-xs text-amber-300">
              O desconto de pacote completo só se aplica contratando os 8 serviços juntos — você já
              tem algum deles contratado individualmente.
            </p>
          )}
        </div>

        {/* Plano de Liderança — progresso */}
        <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <IconUsers width={16} height={16} className="text-gold-light" />
            <span className="font-semibold">Plano de Liderança</span>
          </div>
          <p className="mt-1 text-xs text-muted">
            Usuários diretos ativos: {diretosAtivos} de {metaLideranca}
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-gold"
              style={{ width: `${Math.min(100, (diretosAtivos / metaLideranca) * 100)}%` }}
            />
          </div>
        </div>

        {/* Catálogo */}
        <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
          Serviços
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {catalogo.map((servico) => (
            <ServicoCard
              key={servico.servicoId}
              servico={servico}
              primeiroNome={primeiroNome}
              selecionado={selecionados.has(servico.codigo)}
              onAlternarSelecao={() => alternarSelecao(servico.codigo)}
              onDesativar={() => setDesativarAlvo(servico)}
            />
          ))}
        </div>
      </main>

      {resumoSelecionados && listaSelecionados.length > 0 && (
        <div className="sticky bottom-0 z-30 border-t border-border bg-ink/95 p-4 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-foreground">
              {listaSelecionados.length} serviço(s) selecionado(s) ·{" "}
              <span className="font-semibold text-gold-light">
                {formatMoeda(centavosParaReais(resumoSelecionados.valorFinalCentavos))}
              </span>
            </p>
            <button
              type="button"
              onClick={() =>
                setModal({ tipo: "individual", resumo: resumoSelecionados, forma: "INDIVIDUAL" })
              }
              className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:brightness-110"
            >
              Contratar selecionados
            </button>
          </div>
        </div>
      )}

      {modal && (
        <ModalConfirmarContratacao
          modal={modal}
          onFechar={() => setModal(null)}
          onSucesso={() => {
            setModal(null);
            setSelecionados(new Set());
            router.refresh();
          }}
        />
      )}

      {desativarAlvo && (
        <ModalDesativar
          servico={desativarAlvo}
          onFechar={() => setDesativarAlvo(null)}
          onSucesso={() => {
            setDesativarAlvo(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ServicoCard({
  servico,
  primeiroNome,
  selecionado,
  onAlternarSelecao,
  onDesativar,
}: {
  servico: ServicoComStatusClient;
  primeiroNome: string;
  selecionado: boolean;
  onAlternarSelecao: () => void;
  onDesativar: () => void;
}) {
  const badge = STATUS_BADGE[servico.status];
  const podeSelecionar = !STATUS_BLOQUEIAM_SELECAO.includes(servico.status);
  const ativo = servico.status === "ATIVO";
  const aguardandoElegibilidade = servico.status === "CONTRATADO_AGUARDANDO_ELEGIBILIDADE";

  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        selecionado ? "border-gold/60 bg-gold/5" : "border-border bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-foreground">{servico.nome}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{servico.descricao}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      <p className="mt-3 text-sm font-semibold text-gold-light">
        {formatMoeda(centavosParaReais(servico.tarifaCentavos))}
        <span className="ml-1 text-xs font-normal text-muted">/mês (avulso)</span>
      </p>

      {aguardandoElegibilidade && (
        <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] leading-relaxed text-amber-200">
          A contratação deste serviço não garante sua liberação imediata. O Plano de Liderança
          somente ficará disponível após você atingir 30 usuários diretos ativos ou receber
          autorização excepcional do administrador.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {podeSelecionar && (
          <label className="flex items-center gap-2 text-xs text-foreground">
            <input type="checkbox" checked={selecionado} onChange={onAlternarSelecao} className="h-4 w-4" />
            Selecionar
          </label>
        )}
        {ativo && servico.contatoWhatsapp && (
          <a
            href={linkWhatsapp(
              servico.contatoWhatsapp,
              montarMensagemWhatsapp(servico.mensagemPadrao ?? "Olá {NOME}!", primeiroNome)
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
          >
            <IconWhatsapp width={14} height={14} />
            {servico.nome}
          </a>
        )}
        {(ativo || aguardandoElegibilidade) && (
          <button
            type="button"
            onClick={onDesativar}
            className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-muted hover:bg-white/10"
          >
            Desativar
          </button>
        )}
      </div>
    </div>
  );
}

function ModalConfirmarContratacao({
  modal,
  onFechar,
  onSucesso,
}: {
  modal: NonNullable<ModalContratacao>;
  onFechar: () => void;
  onSucesso: () => void;
}) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [state, action, pending] = useActionState<ContratacaoState, FormData>(contratarServicoAction, undefined);

  useEffect(() => {
    if (state?.sucesso) onSucesso();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const { resumo, forma } = modal;
  const temDesconto = resumo.descontoCentavos > 0;
  const incluiLideranca = resumo.servicos.includes("PLANO_LIDERANCA");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onFechar}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-foreground">Confirmar contratação</h3>

        {state?.error && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {state.error}
          </p>
        )}

        <ul className="mt-4 space-y-1 text-sm text-foreground">
          {resumo.servicos.map((codigo) => (
            <ServicoResumoLinha key={codigo} codigo={codigo} />
          ))}
        </ul>

        <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between text-muted">
            <span>Subtotal</span>
            <span>{formatMoeda(centavosParaReais(resumo.subtotalCentavos))}</span>
          </div>
          {temDesconto && (
            <div className="flex justify-between text-emerald-300">
              <span>Desconto</span>
              <span>− {formatMoeda(centavosParaReais(resumo.descontoCentavos))}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-gold-light">
            <span>Valor final</span>
            <span>{formatMoeda(centavosParaReais(resumo.valorFinalCentavos))}</span>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted">
          O valor será debitado do seu rendimento e bônus disponíveis primeiro; se não for
          suficiente, do capital disponível para saque. Destino: {CARTEIRA_DESTINO_NOME} (
          {CARTEIRA_DESTINO_CODIGO}).
        </p>

        {incluiLideranca && (
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] leading-relaxed text-amber-200">
            O Plano de Liderança somente ficará disponível após você atingir 30 usuários diretos
            ativos ou receber autorização excepcional do administrador.
          </p>
        )}

        <form action={action} className="mt-5 flex gap-2">
          <input type="hidden" name="codigos" value={resumo.servicos.join(",")} />
          <input type="hidden" name="forma" value={forma} />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          <button
            type="button"
            onClick={onFechar}
            className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex-1 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-50"
          >
            {pending ? "Processando..." : "Confirmar"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ServicoResumoLinha({ codigo }: { codigo: CodigoServico }) {
  const nomes: Record<CodigoServico, string> = {
    TRANSFERENCIA_USUARIOS: "Transferência entre usuários",
    REAPLICACAO_AUTOMATICA: "Reaplicação automática",
    ASSESSORIA_CONTABIL: "Assessoria Contábil",
    ASSESSORIA_JURIDICA: "Assessoria Jurídica",
    ASSESSORIA_TI: "Assessoria de TI",
    APLICACAO_BENS: "Aplicação em Bens",
    DOAR_ENTIDADE: "Doar para uma entidade",
    PLANO_LIDERANCA: "Plano de Liderança",
    SAQUE_EMERGENCIA: "Saque de emergência",
  };
  return (
    <li className="flex justify-between">
      <span className="text-muted">{nomes[codigo]}</span>
    </li>
  );
}

function ModalDesativar({
  servico,
  onFechar,
  onSucesso,
}: {
  servico: ServicoComStatusClient;
  onFechar: () => void;
  onSucesso: () => void;
}) {
  const [state, action, pending] = useActionState<ContratacaoState, FormData>(desativarServicoAction, undefined);

  useEffect(() => {
    if (state?.sucesso) onSucesso();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onFechar}>
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-foreground">Desativar &ldquo;{servico.nome}&rdquo;?</h3>
        <p className="mt-2 text-sm text-muted">
          A funcionalidade correspondente fica oculta/bloqueada imediatamente. Não há estorno do
          valor já pago — o histórico da cobrança é mantido.
        </p>

        {state?.error && (
          <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {state.error}
          </p>
        )}

        <form action={action} className="mt-5 flex gap-2">
          <input type="hidden" name="servicoId" value={servico.servicoId} />
          <button
            type="button"
            onClick={onFechar}
            className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-50"
          >
            {pending ? "Desativando..." : "Desativar"}
          </button>
        </form>
      </div>
    </div>
  );
}
