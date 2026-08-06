import Link from "next/link";
import { Logo } from "@/components/logo";
import { AplicacoesHistorico } from "@/app/painel/historico/aplicacoes-historico";
import { SaquesHistorico } from "@/app/painel/historico/saques-historico";
import { RendimentosHistorico } from "@/app/painel/historico/rendimentos-historico";
import { BonusHistorico } from "@/app/painel/historico/bonus-historico";

const agora = Date.now();
const dia = 24 * 60 * 60 * 1000;

const aplicacoes = [
  { id: "a1", valor: 5000, moeda: "BRL", origem: "NOVA_APLICACAO", status: "CONFIRMADA", criadoEm: new Date(agora - 10 * dia), liberaEm: new Date(agora + 80 * dia), motivoRejeicao: null },
  { id: "a2", valor: 640, moeda: "BRL", origem: "REAPLICACAO", status: "CONFIRMADA", criadoEm: new Date(agora - 40 * dia), liberaEm: new Date(agora + 50 * dia), motivoRejeicao: null },
];

const saques = [
  { id: "s1", valor: 480.5, moeda: "BRL", tipo: "RENDIMENTO", status: "PAGO", criadoEm: new Date(agora - 6 * dia), emergencial: false, justificativaRecusa: null },
];

const creditosPlr = [
  { id: "c1", valor: 120, origem: "PLR manual 0,96% (admin)", criadoEm: new Date(agora - 3 * dia), utilizadoEm: null, solicitacaoSaqueId: null },
  { id: "c2", valor: 71.42, origem: "Distribuição 3,2% · jul/2026", criadoEm: new Date(agora - dia), utilizadoEm: null, solicitacaoSaqueId: null },
];

const creditosBonus = [
  { id: "b1", valor: 250, origem: "Indicação: Marina Souza Almeida", criadoEm: new Date(agora - 15 * dia), utilizadoEm: null, solicitacaoSaqueId: null },
];

export default function PreviewPainelHistoricoPage() {
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
          Suas aplicações, saques e créditos de PLR/rendimento, agrupados por mês.
        </p>

        <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-[0.15em] text-muted">Aplicações</p>
        <AplicacoesHistorico itens={aplicacoes} />

        <p className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.15em] text-muted">Saques</p>
        <SaquesHistorico itens={saques} />

        <p className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.15em] text-muted">Rendimentos / PLR</p>
        <RendimentosHistorico itens={creditosPlr} />

        <p className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.15em] text-muted">Bônus</p>
        <BonusHistorico itens={creditosBonus} />
      </main>
    </div>
  );
}
