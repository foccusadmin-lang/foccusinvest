import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda, formatData } from "@/lib/format";
import { maskCPF, maskCNPJ } from "@/lib/cpf-cnpj";
import { MigracaoForm } from "./migracao-form";
import { CancelarMigracaoButton } from "./cancelar-button";
import { AprovarRejeitarButtons } from "./aprovar-buttons";
import { ManualForm } from "./manual-form";

function maskDocumento(documento: string | null): string {
  if (!documento) return "—";
  return documento.length === 14 ? maskCNPJ(documento) : maskCPF(documento);
}

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
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Nome (planilha)</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Capital</th>
                <th className="px-4 py-3">PLR</th>
                <th className="px-4 py-3">Bônus</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Conta vinculada</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {migracoes.map((m) => (
                <tr key={m.id} className="bg-surface align-top">
                  <td className="px-4 py-3 text-foreground">
                    {m.nomeReferencia}
                    {m.emailReferencia && (
                      <p className="mt-0.5 text-[11px] text-muted">{m.emailReferencia}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{maskDocumento(m.documento)}</td>
                  <td className="px-4 py-3 font-semibold text-gold-light">
                    {formatMoeda(m.valor)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-300">
                    {m.valorPlr > 0 ? formatMoeda(m.valorPlr) : "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-fuchsia-300">
                    {m.valorBonus > 0 ? formatMoeda(m.valorBonus) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {m.status === "APLICADA" && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300">
                        Aplicada
                      </span>
                    )}
                    {m.status === "PENDENTE" && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-1 text-xs font-semibold text-amber-300">
                        Aguardando cadastro
                      </span>
                    )}
                    {m.status === "SEM_DOCUMENTO" && (
                      <span className="rounded-full bg-red-500/15 px-2 py-1 text-xs font-semibold text-red-300">
                        Sem CPF/CNPJ
                      </span>
                    )}
                    {m.status === "AGUARDANDO_APROVACAO" && (
                      <span className="rounded-full bg-sky-500/15 px-2 py-1 text-xs font-semibold text-sky-300">
                        Aguardando aprovação
                      </span>
                    )}
                    {m.observacao && (
                      <p className="mt-1 max-w-[220px] text-[11px] leading-tight text-amber-300/90">
                        {m.observacao}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {m.user ? m.user.name ?? m.user.email : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-muted">
                    {formatData(m.criadoEm)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {m.status === "AGUARDANDO_APROVACAO" && (
                      <AprovarRejeitarButtons id={m.id} />
                    )}
                    {m.status === "PENDENTE" && <CancelarMigracaoButton id={m.id} />}
                    {m.status === "SEM_DOCUMENTO" && (
                      <ManualForm migracaoId={m.id} emailSugerido={m.emailReferencia} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
