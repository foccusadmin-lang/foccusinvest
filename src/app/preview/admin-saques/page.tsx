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
  investidorNome: null,
  investidorEmail: null,
  chavePixNormalizada: null,
  chavePixTipo: null,
  pixPayload: null,
  pixTxid: null,
  dataProgramadaPagamento: null,
  pagoEm: null,
  processadoPor: null,
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
    investidorNome: "Waldir Rodrigues Custódio",
    investidorEmail: "waldir.custodio@exemplo.com",
    chavePixNormalizada: "+5511985299785",
    chavePixTipo: "TELEFONE",
    pixTxid: "SAQEXEMPLO001",
    pixPayload: "00020126...exemplo...6304ABCD",
    dataProgramadaPagamento: new Date(agora + 3 * dia),
    user: { name: "Waldir Rodrigues Custódio", email: "waldir.custodio@exemplo.com" },
  }),
  base({
    id: "s2",
    tipo: "RENDIMENTO",
    valor: 480.5,
    status: "AGUARDANDO_PAGAMENTO",
    criadoEm: new Date(agora - 1 * dia),
    investidorNome: "Marina Souza Almeida",
    investidorEmail: "marina.almeida@exemplo.com",
    chavePixNormalizada: "12345678909",
    chavePixTipo: "CPF",
    pixTxid: "SAQEXEMPLO002",
    pixPayload: "00020126...exemplo...6304EFGH",
    dataProgramadaPagamento: new Date(agora + 3 * dia),
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
    pagoEm: new Date(agora - 11 * dia),
    processadoPor: { name: "Admin Foccus", email: "foccusadmin@gmail.com" },
    user: { name: "Carlos Eduardo Lima", email: "carlos.lima@exemplo.com" },
  }),
  base({
    id: "s4",
    tipo: "RENDIMENTO",
    valor: 210,
    status: "RECUSADO",
    justificativaRecusa: "Comprovante ilegível",
    criadoEm: new Date(agora - 20 * dia),
    processadoPor: { name: "Admin Foccus", email: "foccusadmin@gmail.com" },
    user: { name: "Fernanda Costa", email: "fernanda.costa@exemplo.com" },
  }),
];

export default function PreviewAdminSaquesPage() {
  return (
    <AdminPreviewShell>
      <h1 className="text-2xl font-bold text-foreground">Solicitações de Saque</h1>
      <p className="mt-1 text-sm text-muted">{pendentes.length} solicitação(ões) aguardando ação.</p>
      <SaquesTable pendentes={pendentes} historico={historico} />
    </AdminPreviewShell>
  );
}
