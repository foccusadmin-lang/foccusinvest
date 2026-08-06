import { SaquesTable, type SaqueLinha } from "@/app/restrito/saques/saques-table";
import { AdminPreviewShell } from "../_admin-shell";

const agora = Date.now();
const dia = 24 * 60 * 60 * 1000;

const base = (over: Partial<SaqueLinha>): SaqueLinha => ({
  id: "s0",
  tipo: "CAPITAL",
  valor: 1000,
  moeda: "BRL",
  motivoEmergencia: null,
  emergencial: false,
  valorBruto: null,
  taxaAntecipacao: null,
  status: "SOLICITADO",
  justificativaRecusa: null,
  criadoEm: new Date(agora - dia),
  user: { name: "Investidor Exemplo", email: "investidor@exemplo.com" },
  ...over,
});

const pendentes: SaqueLinha[] = [
  base({
    id: "s1",
    tipo: "CAPITAL",
    valor: 3200,
    status: "SOLICITADO",
    criadoEm: new Date(agora - 2 * dia),
    user: { name: "Waldir Rodrigues Custódio", email: "waldir.custodio@exemplo.com" },
  }),
  base({
    id: "s2",
    tipo: "RENDIMENTO",
    valor: 480.5,
    status: "APROVADO",
    criadoEm: new Date(agora - 1 * dia),
    user: { name: "Marina Souza Almeida", email: "marina.almeida@exemplo.com" },
  }),
];

const historico: SaqueLinha[] = [
  base({
    id: "s3",
    tipo: "CAPITAL",
    valor: 950,
    valorBruto: 1000,
    taxaAntecipacao: 50,
    emergencial: true,
    motivoEmergencia: "Emergência médica comprovada",
    status: "PAGO",
    criadoEm: new Date(agora - 12 * dia),
    user: { name: "Carlos Eduardo Lima", email: "carlos.lima@exemplo.com" },
  }),
  base({
    id: "s4",
    tipo: "RENDIMENTO",
    valor: 210,
    status: "RECUSADO",
    justificativaRecusa: "Comprovante ilegível",
    criadoEm: new Date(agora - 20 * dia),
    user: { name: "Fernanda Costa", email: "fernanda.costa@exemplo.com" },
  }),
];

export default function PreviewAdminSaquesPage() {
  return (
    <AdminPreviewShell>
      <h1 className="text-2xl font-bold text-foreground">Saques</h1>
      <p className="mt-1 text-sm text-muted">{pendentes.length} solicitação(ões) aguardando ação.</p>
      <SaquesTable pendentes={pendentes} historico={historico} />
    </AdminPreviewShell>
  );
}
