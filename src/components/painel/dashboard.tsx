import { Logo } from "@/components/logo";
import { SummaryCard } from "./summary-card";
import { RendimentosChart, type PontoRendimento } from "./rendimentos-chart";
import { AcoesRapidas } from "./acoes-rapidas";
import { HeaderMenu } from "./header-menu";
import { ViewSwitcher } from "@/components/admin/view-switcher";
import { ConvidarAmigoButton } from "./convidar-amigo-button";
import { formatMoeda, formatData } from "@/lib/format";
import { IconWallet, IconTrendingUp, IconGift, IconVerified } from "@/components/icons";

export type ResumoFinanceiro = {
  capitalPrincipal: number;
  capitalCarencia: number;
  capitalDisponivel: number;
  distribuicoesAcumuladas: number;
  distribuicoesDisponiveis: number;
  bonusIndicacao: number;
  valoresReaplicados: number;
  valoresEmProcessamento: number;
  saquesPendentes: number;
  aportesEmAnalise: number;
  totalDoacoes: number;
  rentabilidadePeriodo: number;
  proximaLiberacao: Date | null;
  historicoRendimentos: PontoRendimento[];
};

export type PainelUsuario = {
  primeiroNome: string;
  foto?: string | null;
  statusCadastro: string;
  codigoIndicacao?: string | null;
  moeda?: "BRL" | "USD" | "USDT";
  ehAdmin?: boolean;
  saqueEmergencialLiberado?: boolean;
};

const statusLabel: Record<string, { label: string; className: string }> = {
  INCOMPLETO: { label: "Cadastro incompleto", className: "bg-amber-500/15 text-amber-300" },
  PENDENTE: { label: "Em análise", className: "bg-sky-500/15 text-sky-300" },
  APROVADO: { label: "Verificado", className: "bg-emerald-500/15 text-emerald-300" },
  SUSPENSO: { label: "Suspenso", className: "bg-red-500/15 text-red-300" },
  REJEITADO: { label: "Rejeitado", className: "bg-red-500/15 text-red-300" },
};

export function PainelDashboard({
  usuario,
  resumo,
  janelaSaqueRendimentoAberta,
}: {
  usuario: PainelUsuario;
  resumo: ResumoFinanceiro;
  janelaSaqueRendimentoAberta: boolean;
}) {
  const moeda = usuario.moeda ?? "BRL";
  const status = statusLabel[usuario.statusCadastro] ?? statusLabel.INCOMPLETO;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/80 bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <Logo size={30} />
            {usuario.ehAdmin && <ViewSwitcher />}
          </div>
          <HeaderMenu
            primeiroNome={usuario.primeiroNome}
            foto={usuario.foto}
            codigoIndicacao={usuario.codigoIndicacao}
          />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted">Bem-vindo(a) de volta,</p>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground sm:text-3xl">
              {usuario.primeiroNome}
            </h1>
          </div>
          <span
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
          >
            {usuario.statusCadastro === "APROVADO" && (
              <IconVerified width={14} height={14} />
            )}
            {status.label}
          </span>
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
          Resumo
        </p>
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            tone="gold"
            icon={<IconWallet width={18} height={18} />}
            label="Capital"
            value={formatMoeda(resumo.capitalPrincipal, moeda)}
            hint="Saldo principal ativo"
          />
          <SummaryCard
            tone="green"
            icon={<IconTrendingUp width={18} height={18} />}
            label="Rendimentos"
            value={formatMoeda(resumo.distribuicoesAcumuladas, moeda)}
            hint="Liberado toda sexta-feira"
          />
          <SummaryCard
            tone="purple"
            icon={<IconGift width={18} height={18} />}
            label="Bônus"
            value={formatMoeda(resumo.bonusIndicacao, moeda)}
            hint="Bônus de indicação"
          />
        </section>

        <section className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <MiniStat label="Disponível p/ saque" value={formatMoeda(resumo.capitalDisponivel, moeda)} />
          <MiniStat label="Em carência" value={formatMoeda(resumo.capitalCarencia, moeda)} />
          <MiniStat
            label="Rend. disponível"
            value={formatMoeda(resumo.distribuicoesDisponiveis, moeda)}
          />
          <MiniStat label="Reaplicado" value={formatMoeda(resumo.valoresReaplicados, moeda)} />
          <MiniStat
            label="Em processamento"
            value={formatMoeda(resumo.valoresEmProcessamento, moeda)}
          />
          <MiniStat label="Saques pendentes" value={formatMoeda(resumo.saquesPendentes, moeda)} />
          <MiniStat
            label="Aporte em análise"
            value={formatMoeda(resumo.aportesEmAnalise, moeda)}
          />
        </section>

        <section className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">
              Rentabilidade do período
            </p>
            <p className="mt-1 text-xl font-semibold text-gold-light">
              {resumo.rentabilidadePeriodo > 0 ? "+" : ""}
              {resumo.rentabilidadePeriodo.toFixed(2)}%
            </p>
          </div>
          <div className="h-px w-full bg-border sm:h-10 sm:w-px" />
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">
              Próxima data de liberação
            </p>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {resumo.proximaLiberacao ? formatData(resumo.proximaLiberacao) : "—"}
            </p>
          </div>
          {usuario.codigoIndicacao && (
            <>
              <div className="h-px w-full bg-border sm:h-10 sm:w-px" />
              <div>
                <p className="text-xs uppercase tracking-wider text-muted">
                  Seu código de indicação
                </p>
                <p className="mt-1 text-xl font-semibold tracking-wide text-foreground">
                  {usuario.codigoIndicacao}
                </p>
              </div>
              <div className="h-px w-full bg-border sm:h-10 sm:w-px" />
              <ConvidarAmigoButton codigoIndicacao={usuario.codigoIndicacao} />
            </>
          )}
        </section>

        <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
          Ações rápidas
        </p>
        <AcoesRapidas
          saldoParaReaplicar={resumo.distribuicoesDisponiveis + resumo.bonusIndicacao}
          janelaSaqueRendimentoAberta={janelaSaqueRendimentoAberta}
          verificado={usuario.statusCadastro === "APROVADO"}
          capitalPrincipal={resumo.capitalPrincipal}
          capitalDisponivel={resumo.capitalDisponivel}
          capitalCarencia={resumo.capitalCarencia}
          rendimentoDisponivel={resumo.distribuicoesDisponiveis}
          distribuicoesAcumuladas={resumo.distribuicoesAcumuladas}
          proximaLiberacao={resumo.proximaLiberacao}
          moeda={usuario.moeda ?? "BRL"}
          saqueEmergencialLiberado={usuario.saqueEmergencialLiberado ?? false}
          codigoIndicacao={usuario.codigoIndicacao ?? null}
        />

        <p className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
          Atividade
        </p>
        <RendimentosChart pontos={resumo.historicoRendimentos} moeda={moeda} />
      </main>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-surface-2 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
