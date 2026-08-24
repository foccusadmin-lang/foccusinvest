import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SummaryCard } from "@/components/painel/summary-card";
import { formatMoeda } from "@/lib/format";
import { getConfiguracao } from "@/lib/configuracao";
import { liberarIncentivoAutomaticoSeNecessario } from "@/lib/incentivo-lideranca";
import { ControleSaques } from "./controle-saques";
import { AdminActionsGrid } from "@/components/admin/admin-actions-grid";
import { inicioDoMesBrasilia } from "@/lib/datas";
import {
  IconWallet,
  IconUsers,
  IconClock,
  IconArrowDown,
  IconTrendingUp,
} from "@/components/icons";

export default async function RestritoPainelPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  // Fallback do incentivo de liderança automático: se o Vercel Cron não disparou por qualquer
  // motivo (CRON_SECRET ausente, etc), garante que ainda assim é liberado quando o admin abre
  // esse painel depois das 19h — nunca deixa quebrar a página se der algum problema.
  await liberarIncentivoAutomaticoSeNecessario().catch((e) =>
    console.error("Falha no fallback do incentivo de liderança automático:", e)
  );

  const agora = new Date();
  const inicioMes = inicioDoMesBrasilia();

  const [
    totalUsuarios,
    cadastrosPendentes,
    aplicacoesAtivas,
    saquesAtivos,
    aportesAguardando,
    creditosRendimento,
    creditosDoMesPorUsuario,
    distribuicoesAtivas,
    configuracao,
  ] = await Promise.all([
    prisma.user.count({ where: { perfil: { not: "ADMIN" } } }),
    prisma.user.count({ where: { statusCadastro: "PENDENTE", perfil: { not: "ADMIN" } } }),
    prisma.aplicacao.findMany({
      where: { status: { in: ["CONFIRMADA", "SAQUE_SOLICITADO"] } },
      omit: { comprovante: true },
    }),
    prisma.solicitacaoSaque.findMany({ where: { status: { in: ["SOLICITADO", "APROVADO"] } } }),
    prisma.aplicacao.count({ where: { status: "AGUARDANDO_APROVACAO" } }),
    prisma.creditoCarteira.aggregate({ where: { tipo: "RENDIMENTO" }, _sum: { valor: true } }),
    prisma.creditoCarteira.groupBy({
      by: ["userId"],
      where: {
        tipo: "RENDIMENTO",
        criadoEm: { gte: inicioMes },
        OR: [{ origem: { startsWith: "PLR manual" } }, { origem: { startsWith: "Distribuição " } }],
      },
      _sum: { valor: true },
    }),
    prisma.distribuicaoMensal.count({ where: { status: "ATIVA" } }),
    getConfiguracao(),
  ]);

  const capitalTotal = aplicacoesAtivas.reduce((acc, a) => acc + a.valor, 0);
  const capitalEmCarencia = aplicacoesAtivas
    .filter((a) => a.status === "CONFIRMADA" && a.liberaEm > agora)
    .reduce((acc, a) => acc + a.valor, 0);
  const valorSaquesPendentes = saquesAtivos.reduce((acc, s) => acc + s.valor, 0);

  /** Rentabilidade do período: mesma conta que cada investidor vê no painel dele (creditado
   *  no mês / capital do próprio investidor), com a média simples entre quem recebeu algo —
   *  não a soma de todo mundo dividida pelo capital de todo mundo, que dá um número puxado
   *  pra qualquer conta com capital desproporcional ao crédito. Assim o número lançado (ex:
   *  0,19%) aparece igual pro investidor e pro admin. Só conta PLR Individual e Distribuição
   *  (a query já filtra por origem) — migração de saldo e ajuste manual ficam de fora por não
   *  serem baseados em percentual. */
  const capitalPorUsuario = new Map<string, number>();
  for (const a of aplicacoesAtivas) {
    capitalPorUsuario.set(a.userId, (capitalPorUsuario.get(a.userId) ?? 0) + a.valor);
  }
  const percentuaisDoMes = creditosDoMesPorUsuario
    .map((c) => {
      const capital = capitalPorUsuario.get(c.userId) ?? 0;
      if (capital <= 0) return null;
      return ((c._sum.valor ?? 0) / capital) * 100;
    })
    .filter((p): p is number => p !== null);
  const rentabilidadePeriodo =
    percentuaisDoMes.length > 0
      ? percentuaisDoMes.reduce((acc, p) => acc + p, 0) / percentuaisDoMes.length
      : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Painel administrativo</h1>
      <p className="mt-1 text-sm text-muted">Visão geral da plataforma em tempo real.</p>

      <div className="mt-6">
        <ControleSaques
          modoSaqueCapital={configuracao.modoSaqueCapital}
          modoSaqueRendimento={configuracao.modoSaqueRendimento}
          modoVerificacaoCadastro={configuracao.modoVerificacaoCadastro}
          modoIncentivoLideranca={configuracao.modoIncentivoLideranca}
          modoBonusIndicacao={configuracao.modoBonusIndicacao}
        />
      </div>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          tone="blue"
          icon={<IconUsers width={18} height={18} />}
          label="Usuários"
          value={String(totalUsuarios)}
          hint={`${cadastrosPendentes} cadastro(s) pendente(s) de aprovação`}
        />
        <SummaryCard
          tone="gold"
          icon={<IconWallet width={18} height={18} />}
          label="Capital"
          value={formatMoeda(capitalTotal)}
          hint={`${formatMoeda(capitalEmCarencia)} em carência`}
        />
        <SummaryCard
          tone="purple"
          icon={<IconArrowDown width={18} height={18} />}
          label="Saques"
          value={formatMoeda(valorSaquesPendentes)}
          hint={`${saquesAtivos.length} solicitação(ões) aguardando ação`}
        />
        <SummaryCard
          tone="green"
          icon={<IconTrendingUp width={18} height={18} />}
          label="Rendimentos"
          value={formatMoeda(creditosRendimento._sum.valor ?? 0)}
          hint="Total já distribuído aos investidores"
        />
        <SummaryCard
          tone="neutral"
          icon={<IconClock width={18} height={18} />}
          label="Distribuições ativas"
          value={String(distribuicoesAtivas)}
          hint="Períodos em diluição diária"
        />
        <SummaryCard
          tone="gold"
          icon={<IconTrendingUp width={18} height={18} />}
          label="Rentabilidade do período"
          value={`${rentabilidadePeriodo > 0 ? "+" : ""}${rentabilidadePeriodo.toFixed(2)}%`}
          hint="Creditado este mês (Distribuições + PLR Individual)"
        />
      </section>

      <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
        Ações administrativas
      </p>
      <AdminActionsGrid />

      {cadastrosPendentes > 0 && (
        <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          Há <strong>{cadastrosPendentes}</strong> cadastro(s) aguardando aprovação em{" "}
          <a href="/restrito/usuarios" className="underline">
            Usuários
          </a>
          .
        </div>
      )}
      {saquesAtivos.length > 0 && (
        <div className="mt-3 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-sky-200">
          Há <strong>{saquesAtivos.length}</strong> solicitação(ões) de saque aguardando ação em{" "}
          <a href="/restrito/saques" className="underline">
            Saques
          </a>
          .
        </div>
      )}
      {aportesAguardando > 0 && (
        <div className="mt-3 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-200">
          Há <strong>{aportesAguardando}</strong> comprovante(s) de Pix aguardando conferência em{" "}
          <a href="/restrito/aportes" className="underline">
            Aportes
          </a>
          .
        </div>
      )}
    </div>
  );
}
