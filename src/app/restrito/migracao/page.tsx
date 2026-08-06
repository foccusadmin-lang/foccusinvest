import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda } from "@/lib/format";
import { MigracaoForm } from "./migracao-form";
import { MigracoesLista } from "./migracoes-lista";

export default async function RestritoMigracaoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const migracoes = await prisma.migracaoSaldo.findMany({
    where: { status: { not: "CANCELADA" } },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { criadoEm: "desc" },
    take: 500,
  });

  const aguardandoAprovacao = migracoes.filter((m) => m.status === "AGUARDANDO_APROVACAO");
  const pendentes = migracoes.filter((m) => m.status === "PENDENTE");
  const semDocumento = migracoes.filter((m) => m.status === "SEM_DOCUMENTO");
  const aplicadas = migracoes.filter((m) => m.status === "APLICADA");

  const total = (m: { valor: number; valorPlr: number; valorBonus: number }) =>
    m.valor + m.valorPlr + m.valorBonus;
  const totalAguardando = aguardandoAprovacao.reduce((acc, m) => acc + total(m), 0);
  const totalPendente = pendentes.reduce((acc, m) => acc + total(m), 0);
  const totalAplicado = aplicadas.reduce((acc, m) => acc + total(m), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Migração de saldo (Mocha)</h1>
      <p className="mt-1 text-sm text-muted">
        Importe o saldo dos investidores que já tinham capital investido na plataforma anterior.
        Nenhum valor é creditado sozinho: quem já tem conta (ou completa o cadastro depois) cai
        numa lista de aprovação, você confere nome e valor e clica em Aprovar. Quem ainda não tem
        conta fica reservado por CPF/CNPJ até se cadastrar; sem CPF na planilha, fica marcado para
        lançamento manual pelo e-mail.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Aguardando aprovação
          </p>
          <p className="mt-1 text-2xl font-bold text-sky-300">{aguardandoAprovacao.length}</p>
          <p className="text-xs text-muted">{formatMoeda(totalAguardando)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Aguardando cadastro
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-300">{pendentes.length}</p>
          <p className="text-xs text-muted">{formatMoeda(totalPendente)} reservados</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Sem documento
          </p>
          <p className="mt-1 text-2xl font-bold text-red-300">{semDocumento.length}</p>
          <p className="text-xs text-muted">Precisam de lançamento manual</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Já aplicadas
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">{aplicadas.length}</p>
          <p className="text-xs text-muted">{formatMoeda(totalAplicado)} lançados</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <MigracaoForm />
      </div>

      <p className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
        Lançamentos
      </p>

      {migracoes.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
          Nenhuma migração importada ainda.
        </p>
      ) : (
        <MigracoesLista migracoes={migracoes} />
      )}
    </div>
  );
}
