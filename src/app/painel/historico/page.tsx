import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/logo";
import { AplicacoesHistorico } from "./aplicacoes-historico";
import { SaquesHistorico } from "./saques-historico";
import { RendimentosHistorico } from "./rendimentos-historico";
import { BonusHistorico } from "./bonus-historico";
import { ORIGEM_INCENTIVO_PREFIXO } from "@/lib/incentivo-lideranca";

export default async function HistoricoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const ehLider = session.user.perfil === "LIDER";

  const [aplicacoes, saques, creditosPlr, creditosBonus] = await Promise.all([
    prisma.aplicacao.findMany({
      where: { userId: session.user.id },
      orderBy: { criadoEm: "desc" },
      select: {
        id: true,
        valor: true,
        moeda: true,
        origem: true,
        status: true,
        criadoEm: true,
        liberaEm: true,
        motivoRejeicao: true,
      },
    }),
    prisma.solicitacaoSaque.findMany({
      where: { userId: session.user.id },
      orderBy: { criadoEm: "desc" },
      select: {
        id: true,
        valor: true,
        moeda: true,
        tipo: true,
        status: true,
        criadoEm: true,
        emergencial: true,
        justificativaRecusa: true,
      },
    }),
    prisma.creditoCarteira.findMany({
      where: { userId: session.user.id, tipo: "RENDIMENTO" },
      orderBy: { criadoEm: "desc" },
      select: {
        id: true,
        valor: true,
        origem: true,
        criadoEm: true,
        utilizadoEm: true,
        solicitacaoSaqueId: true,
      },
    }),
    prisma.creditoCarteira.findMany({
      where: { userId: session.user.id, tipo: "BONUS" },
      orderBy: { criadoEm: "desc" },
      select: {
        id: true,
        valor: true,
        origem: true,
        criadoEm: true,
        utilizadoEm: true,
        solicitacaoSaqueId: true,
      },
    }),
  ]);

  const creditosIncentivo = creditosPlr.filter((c) => c.origem.startsWith(ORIGEM_INCENTIVO_PREFIXO));
  const creditosPlrSemIncentivo = creditosPlr.filter(
    (c) => !c.origem.startsWith(ORIGEM_INCENTIVO_PREFIXO)
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/80 bg-ink/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo size={30} />
          <Link href="/painel" className="text-sm text-muted hover:text-gold-light">
            Voltar ao painel
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-foreground">Histórico</h1>
        <p className="mt-1 text-sm text-muted">
          Suas aplicações, saques e créditos de PLR/rendimento, agrupados por dia.
        </p>

        <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
          Aplicações
        </p>
        <AplicacoesHistorico itens={aplicacoes} />

        <p className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
          Saques
        </p>
        <SaquesHistorico itens={saques} />

        <p className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
          Rendimentos / PLR
        </p>
        <RendimentosHistorico itens={creditosPlrSemIncentivo} />

        {ehLider && (
          <>
            <p className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.15em] text-gold-light">
              Incentivo de liderança
            </p>
            <RendimentosHistorico
              itens={creditosIncentivo}
              mensagemVazio="Você ainda não recebeu incentivo de liderança."
            />
          </>
        )}

        <p className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
          Bônus
        </p>
        <BonusHistorico itens={creditosBonus} />
      </main>
    </div>
  );
}
