import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/logo";
import { formatMoeda, formatData } from "@/lib/format";

const STATUS_APLICACAO: Record<string, { label: string; className: string }> = {
  AGUARDANDO_APROVACAO: { label: "Aguardando aprovação", className: "bg-amber-500/15 text-amber-300" },
  CONFIRMADA: { label: "Confirmada", className: "bg-emerald-500/15 text-emerald-300" },
  SAQUE_SOLICITADO: { label: "Confirmada", className: "bg-emerald-500/15 text-emerald-300" },
  RETIRADA: { label: "Encerrada", className: "bg-white/10 text-muted" },
  REJEITADA: { label: "Rejeitada", className: "bg-red-500/15 text-red-300" },
};

const ORIGEM_LABEL: Record<string, string> = {
  NOVA_APLICACAO: "Nova aplicação",
  REAPLICACAO: "Reaplicação",
  MIGRACAO: "Migração",
  AJUSTE_ADMIN: "Ajuste (admin)",
};

export default async function HistoricoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [aplicacoes, creditosPlr] = await Promise.all([
    prisma.aplicacao.findMany({
      where: { userId: session.user.id },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.creditoCarteira.findMany({
      where: { userId: session.user.id, tipo: "RENDIMENTO" },
      orderBy: { criadoEm: "desc" },
    }),
  ]);

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
          Suas aplicações, reaplicações e créditos de PLR/rendimento.
        </p>

        <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
          Aplicações
        </p>
        {aplicacoes.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
            Você ainda não tem aplicações.
          </p>
        ) : (
          <div className="space-y-3">
            {aplicacoes.map((a) => {
              const status = STATUS_APLICACAO[a.status] ?? {
                label: a.status,
                className: "bg-white/10 text-muted",
              };
              return (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-surface p-4"
                >
                  <div>
                    <p className="font-semibold text-foreground">
                      {formatMoeda(a.valor, a.moeda as "BRL")}
                    </p>
                    <p className="text-xs text-muted">
                      {ORIGEM_LABEL[a.origem] ?? a.origem} · {formatData(a.criadoEm)}
                    </p>
                    {a.status === "CONFIRMADA" && (
                      <p className="mt-0.5 text-xs text-muted">
                        Liberação em {formatData(a.liberaEm)}
                      </p>
                    )}
                    {a.status === "REJEITADA" && a.motivoRejeicao && (
                      <p className="mt-0.5 text-xs text-red-300/90">{a.motivoRejeicao}</p>
                    )}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <p className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
          PLR / Rendimentos
        </p>
        {creditosPlr.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
            Você ainda não recebeu créditos de PLR/rendimento.
          </p>
        ) : (
          <div className="space-y-3">
            {creditosPlr.map((c) => {
              const usado = Boolean(c.utilizadoEm || c.solicitacaoSaqueId);
              return (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-surface p-4"
                >
                  <div>
                    <p className="font-semibold text-gold-light">{formatMoeda(c.valor)}</p>
                    <p className="text-xs text-muted">
                      {c.origem} · {formatData(c.criadoEm)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      usado ? "bg-white/10 text-muted" : "bg-emerald-500/15 text-emerald-300"
                    }`}
                  >
                    {usado ? "Já usado" : "Disponível"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
