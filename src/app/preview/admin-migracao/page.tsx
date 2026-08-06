import { MigracoesLista } from "@/app/restrito/migracao/migracoes-lista";
import { AdminPreviewShell } from "../_admin-shell";

const agora = Date.now();
const dia = 24 * 60 * 60 * 1000;

const migracoes = [
  {
    id: "m1",
    nomeReferencia: "José Antônio Ferreira",
    emailReferencia: "jose.ferreira@exemplo.com",
    documento: "52998224725",
    valor: 8200,
    valorPlr: 340,
    valorBonus: 0,
    status: "PENDENTE",
    observacao: "Migrado da plataforma Mocha",
    criadoEm: new Date(agora - 15 * dia),
    user: null,
  },
  {
    id: "m2",
    nomeReferencia: "Fernanda Costa",
    emailReferencia: "fernanda.costa@exemplo.com",
    documento: "39812345611",
    valor: 3100,
    valorPlr: 0,
    valorBonus: 50,
    status: "APLICADA",
    observacao: null,
    criadoEm: new Date(agora - 40 * dia),
    user: { name: "Fernanda Costa", email: "fernanda.costa@exemplo.com" },
  },
];

export default function PreviewAdminMigracaoPage() {
  return (
    <AdminPreviewShell>
      <h1 className="text-2xl font-bold text-foreground">Migração de saldo</h1>
      <p className="mt-1 text-sm text-muted">Saldos trazidos de outra plataforma, aplicados automaticamente ao cadastro.</p>
      <div className="mt-6">
        <MigracoesLista migracoes={migracoes} />
      </div>
    </AdminPreviewShell>
  );
}
