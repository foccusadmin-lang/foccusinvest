import { ReaplicacoesTabelas, type ResumoInvestidor, type ReaplicacaoLinha } from "@/app/restrito/reaplicacoes/reaplicacoes-tabelas";
import { AdminPreviewShell } from "../_admin-shell";

const agora = Date.now();
const dia = 24 * 60 * 60 * 1000;

const resumoPorUsuario: ResumoInvestidor[] = [
  {
    userId: "u1",
    nome: "Waldir Rodrigues Custódio",
    email: "waldir.custodio@exemplo.com",
    totalReaplicado: 1840,
    quantidade: 3,
    rendimentoDisponivel: 120.5,
    capitalAtual: 12500,
  },
];

const reaplicacoes: ReaplicacaoLinha[] = [
  {
    id: "r1",
    valor: 640,
    moeda: "BRL",
    origem: "REAPLICACAO",
    criadoEm: new Date(agora - 5 * dia),
    user: { name: "Waldir Rodrigues Custódio", email: "waldir.custodio@exemplo.com" },
  },
  {
    id: "r2",
    valor: 112.5,
    moeda: "BRL",
    origem: "REAPLICACAO_AUTOMATICA",
    criadoEm: new Date(agora - 1 * dia),
    user: { name: "Waldir Rodrigues Custódio", email: "waldir.custodio@exemplo.com" },
  },
];

export default function PreviewAdminReaplicacoesPage() {
  return (
    <AdminPreviewShell>
      <h1 className="text-2xl font-bold text-foreground">Reaplicações</h1>
      <p className="mt-1 text-sm text-muted">
        {reaplicacoes.length} reaplicação(ões) de {resumoPorUsuario.length} investidor(es) · Total{" "}
        {(1840).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </p>
      <div className="mt-6">
        <ReaplicacoesTabelas resumoPorUsuario={resumoPorUsuario} reaplicacoes={reaplicacoes} />
      </div>
    </AdminPreviewShell>
  );
}
