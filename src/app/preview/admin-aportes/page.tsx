import { AportesLista, type AportePendente, type AporteRecente } from "@/app/restrito/aportes/aportes-lista";
import { AdminPreviewShell } from "../_admin-shell";

const agora = Date.now();
const dia = 24 * 60 * 60 * 1000;

const pendentes: AportePendente[] = [
  {
    id: "ap1",
    valor: 2000,
    criadoEm: new Date(agora - dia),
    user: { name: "Marina Souza Almeida", email: "marina.almeida@exemplo.com" },
  },
];

const recentes: AporteRecente[] = [
  {
    id: "ap2",
    valor: 5000,
    status: "CONFIRMADA",
    motivoRejeicao: null,
    aprovadoEm: new Date(agora - 3 * dia),
    user: { name: "Waldir Rodrigues Custódio", email: "waldir.custodio@exemplo.com" },
    aprovadoPor: { name: "Admin", email: "admin@foccusinvest.com.br" },
  },
  {
    id: "ap3",
    valor: 800,
    status: "REJEITADA",
    motivoRejeicao: "Comprovante não corresponde ao valor informado",
    aprovadoEm: new Date(agora - 8 * dia),
    user: { name: "Carlos Eduardo Lima", email: "carlos.lima@exemplo.com" },
    aprovadoPor: { name: "Admin", email: "admin@foccusinvest.com.br" },
  },
];

export default function PreviewAdminAportesPage() {
  return (
    <AdminPreviewShell>
      <h1 className="text-2xl font-bold text-foreground">Aportes (Pix)</h1>
      <p className="mt-1 text-sm text-muted">Confira os comprovantes enviados antes de confirmar cada aporte.</p>
      <div className="mt-6">
        <AportesLista pendentes={pendentes} recentes={recentes} />
      </div>
    </AdminPreviewShell>
  );
}
