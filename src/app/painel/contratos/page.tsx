import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/logo";
import { formatMoeda, formatData } from "@/lib/format";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  AGUARDANDO_APROVACAO: { label: "Aguardando aprovação", className: "bg-amber-500/15 text-amber-300" },
  CONFIRMADA: { label: "Confirmado", className: "bg-emerald-500/15 text-emerald-300" },
  SAQUE_SOLICITADO: { label: "Confirmado", className: "bg-emerald-500/15 text-emerald-300" },
  RETIRADA: { label: "Encerrado", className: "bg-white/10 text-muted" },
  REJEITADA: { label: "Rejeitado", className: "bg-red-500/15 text-red-300" },
};

export default async function ContratosPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const contratos = await prisma.contrato.findMany({
    where: { userId: session.user.id },
    orderBy: { criadoEm: "desc" },
    include: { aplicacao: { select: { status: true } } },
  });

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
        <h1 className="text-2xl font-bold text-foreground">Meus contratos</h1>
        <p className="mt-1 text-sm text-muted">
          Contratos de prestação de serviços gerados a cada aplicação, com os dados confirmados
          no momento da contratação.
        </p>

        {contratos.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
            Você ainda não tem contratos. Eles são gerados automaticamente quando você faz uma
            nova aplicação.
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            {contratos.map((c) => {
              const status = STATUS_LABEL[c.aplicacao.status] ?? {
                label: c.aplicacao.status,
                className: "bg-white/10 text-muted",
              };
              return (
                <Link
                  key={c.id}
                  href={`/painel/contratos/${c.id}`}
                  className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 transition hover:border-gold/40"
                >
                  <div>
                    <p className="font-semibold text-foreground">{formatMoeda(c.valor)}</p>
                    <p className="text-xs text-muted">Assinado em {formatData(c.criadoEm)}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
                    {status.label}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
