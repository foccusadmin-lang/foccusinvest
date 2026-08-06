import { DoacoesLista } from "@/app/restrito/doacoes/doacoes-lista";
import { formatMoeda } from "@/lib/format";
import { AdminPreviewShell } from "../_admin-shell";

const agora = Date.now();
const dia = 24 * 60 * 60 * 1000;

const entidade = {
  user: {
    email: "contato@refrigerio.exemplo.com",
    pessoaJuridica: { nomeFantasia: null, razaoSocial: "Ministério Apostólico Refrigério" },
  },
};

const pendentes = [
  {
    id: "d1",
    valorBruto: 300,
    status: "EM_ANALISE",
    tipoDoacao: "NOVA_APLICACAO",
    doacaoAnonima: false,
    motivoRecusa: null,
    criadoEm: new Date(agora - dia),
    doador: { name: "Marina Souza Almeida", email: "marina.almeida@exemplo.com" },
    entidade,
  },
];

const recentes = [
  {
    id: "d2",
    valorBruto: 150,
    status: "CONFIRMADA",
    tipoDoacao: "SALDO_DISPONIVEL",
    doacaoAnonima: true,
    motivoRecusa: null,
    criadoEm: new Date(agora - 6 * dia),
    doador: { name: "Waldir Rodrigues Custódio", email: "waldir.custodio@exemplo.com" },
    entidade,
  },
];

export default function PreviewAdminDoacoesPage() {
  const totalPendente = pendentes.reduce((acc, d) => acc + d.valorBruto, 0);
  return (
    <AdminPreviewShell>
      <h1 className="text-2xl font-bold text-foreground">Doações para entidades</h1>
      <p className="mt-1 text-sm text-muted">
        Doações do tipo "Nova aplicação" ficam em análise até conferir o comprovante.
      </p>
      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Aguardando aprovação</p>
        <p className="mt-1 text-2xl font-bold text-amber-300">{pendentes.length}</p>
        <p className="text-xs text-muted">{formatMoeda(totalPendente)}</p>
      </div>
      <DoacoesLista pendentes={pendentes} recentes={recentes} />
    </AdminPreviewShell>
  );
}
