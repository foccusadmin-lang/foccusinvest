import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getResumoCarteira } from "@/lib/carteira";
import { formatMoeda, formatData } from "@/lib/format";
import { SummaryCard } from "@/components/painel/summary-card";
import { IconWallet, IconTrendingUp, IconGift } from "@/components/icons";
import { AjusteSaldoButton } from "@/app/restrito/usuarios/ajuste-modal";

export const EMAIL_FUNDO_CAIXA = "foccusadmin@gmail.com";

type LinhaFundo = {
  id: string;
  data: Date;
  tipo: "Aporte" | "Rendimento" | "Bônus";
  origem: string;
  valor: number;
  status: string;
};

export default async function RestritoFundoCaixaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const conta = await prisma.user.findFirst({ where: { email: EMAIL_FUNDO_CAIXA } });
  if (!conta) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-foreground">Fundo de Caixa</h1>
        <p className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Conta {EMAIL_FUNDO_CAIXA} não encontrada — o fundo de caixa depende dela existir.
        </p>
      </div>
    );
  }

  const agora = new Date();
  const [resumo, creditos, aplicacoes] = await Promise.all([
    getResumoCarteira(conta.id),
    prisma.creditoCarteira.findMany({ where: { userId: conta.id }, orderBy: { criadoEm: "desc" } }),
    prisma.aplicacao.findMany({ where: { userId: conta.id }, omit: { comprovante: true }, orderBy: { criadoEm: "desc" } }),
  ]);

  const linhas: LinhaFundo[] = [
    ...creditos.map((c): LinhaFundo => ({
      id: c.id,
      data: c.criadoEm,
      tipo: c.tipo === "RENDIMENTO" ? "Rendimento" : "Bônus",
      origem: c.origem,
      valor: c.valor,
      status: c.utilizadoEm ? "Usado" : c.solicitacaoSaqueId ? "Reservado (saque)" : "Disponível",
    })),
    ...aplicacoes.map((a): LinhaFundo => {
      const status =
        a.status === "CONFIRMADA"
          ? a.liberaEm > agora
            ? "Em carência"
            : "Disponível"
          : a.status === "SAQUE_SOLICITADO"
            ? "Reservado (saque)"
            : a.status === "RETIRADA"
              ? "Sacado"
              : a.status === "AGUARDANDO_APROVACAO"
                ? "Aguardando aprovação"
                : "Rejeitado";
      return { id: a.id, data: a.criadoEm, tipo: "Aporte", origem: a.origem ?? "—", valor: a.valor, status };
    }),
  ].sort((a, b) => b.data.getTime() - a.data.getTime());

  const usuarioParaAjuste = {
    id: conta.id,
    nome: conta.name ?? conta.email,
    email: conta.email,
    capital: resumo.capitalPrincipal,
    rendimento: resumo.distribuicoesDisponiveis,
    bonus: resumo.bonusIndicacao,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Fundo de Caixa</h1>
      <p className="mt-1 text-sm text-muted">
        Conferência e distribuição dos recursos que entram pra conta do sistema ({EMAIL_FUNDO_CAIXA}) — taxas
        de saque de carência, descontos e outros lançamentos administrativos.
      </p>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          tone="gold"
          icon={<IconWallet width={18} height={18} />}
          label="Capital"
          value={formatMoeda(resumo.capitalPrincipal)}
          hint={`${formatMoeda(resumo.capitalDisponivel)} disponível · ${formatMoeda(resumo.capitalCarencia)} em carência`}
        />
        <SummaryCard
          tone="green"
          icon={<IconTrendingUp width={18} height={18} />}
          label="Rendimento disponível"
          value={formatMoeda(resumo.distribuicoesDisponiveis)}
          hint="Taxas de carência e outros créditos ainda não sacados"
        />
        <SummaryCard
          tone="purple"
          icon={<IconGift width={18} height={18} />}
          label="Bônus disponível"
          value={formatMoeda(resumo.bonusIndicacao)}
        />
      </section>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Distribuir / ajustar</h2>
        <AjusteSaldoButton usuario={usuarioParaAjuste} />
      </div>
      <p className="mt-1 text-xs text-muted">
        Use pra sacar (distribuir) o que estiver disponível, ou pra ajustar o saldo dessa conta — mesmo
        recurso já usado pra qualquer investidor em Usuários.
      </p>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-foreground">
        Conferência — histórico completo ({linhas.length} lançamento(s))
      </h2>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Origem</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {linhas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  Nenhum lançamento ainda.
                </td>
              </tr>
            )}
            {linhas.map((l) => (
              <tr key={`${l.tipo}-${l.id}`} className="bg-surface">
                <td className="px-4 py-3 text-muted">{formatData(l.data)}</td>
                <td className="px-4 py-3 text-foreground">{l.tipo}</td>
                <td className="px-4 py-3 text-muted">{l.origem}</td>
                <td className="px-4 py-3 font-semibold text-gold-light">{formatMoeda(l.valor)}</td>
                <td className="px-4 py-3 text-muted">{l.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
