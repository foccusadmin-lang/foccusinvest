import { SummaryCard } from "@/components/painel/summary-card";
import { formatMoeda } from "@/lib/format";
import { ControleSaques } from "@/app/restrito/painel/controle-saques";
import { AdminActionsGrid } from "@/components/admin/admin-actions-grid";
import { AdminPreviewShell } from "../_admin-shell";
import { IconWallet, IconUsers, IconClock, IconArrowDown, IconTrendingUp } from "@/components/icons";

export default function PreviewAdminPainelPage() {
  return (
    <AdminPreviewShell>
      <h1 className="text-2xl font-bold text-foreground">Painel administrativo</h1>
      <p className="mt-1 text-sm text-muted">Visão geral da plataforma em tempo real.</p>

      <div className="mt-6">
        <ControleSaques
          modoSaqueCapital="AUTOMATICO"
          modoSaqueRendimento="MANUAL"
          modoVerificacaoCadastro="MANUAL"
          modoIncentivoLideranca="MANUAL"
        />
      </div>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          tone="blue"
          icon={<IconUsers width={18} height={18} />}
          label="Usuários"
          value="248"
          hint="6 cadastro(s) pendente(s) de aprovação"
        />
        <SummaryCard
          tone="gold"
          icon={<IconWallet width={18} height={18} />}
          label="Capital"
          value={formatMoeda(1842650.32)}
          hint={`${formatMoeda(214300)} em carência`}
        />
        <SummaryCard
          tone="purple"
          icon={<IconArrowDown width={18} height={18} />}
          label="Saques"
          value={formatMoeda(38900)}
          hint="9 solicitação(ões) aguardando ação"
        />
        <SummaryCard
          tone="green"
          icon={<IconTrendingUp width={18} height={18} />}
          label="Rendimentos"
          value={formatMoeda(96420.15)}
          hint="Total já distribuído aos investidores"
        />
        <SummaryCard
          tone="neutral"
          icon={<IconClock width={18} height={18} />}
          label="Distribuições ativas"
          value="3"
          hint="Períodos em diluição diária"
        />
        <SummaryCard
          tone="gold"
          icon={<IconTrendingUp width={18} height={18} />}
          label="Rentabilidade do período"
          value="+1.84%"
          hint="Creditado este mês (Distribuições + PLR Individual)"
        />
      </section>

      <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
        Ações administrativas
      </p>
      <AdminActionsGrid />

      <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
        Há <strong>6</strong> cadastro(s) aguardando aprovação em Usuários.
      </div>
      <div className="mt-3 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-sky-200">
        Há <strong>9</strong> solicitação(ões) de saque aguardando ação em Saques.
      </div>
      <div className="mt-3 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-200">
        Há <strong>2</strong> comprovante(s) de Pix aguardando conferência em Aportes.
      </div>
    </AdminPreviewShell>
  );
}
