import { LiderancaLista, type LiderLinha } from "@/app/restrito/lideranca/lideranca-lista";
import { AdminPreviewShell } from "../_admin-shell";

const agora = Date.now();
const dia = 24 * 60 * 60 * 1000;

const lideres: LiderLinha[] = [
  {
    id: "l1",
    nome: "Waldir Rodrigues Custódio",
    email: "waldir.custodio@exemplo.com",
    capital: 12500,
    incentivoAcumulado: 186.4,
    incentivoDisponivel: 48.6,
    desde: new Date(agora - 210 * dia),
  },
  {
    id: "l2",
    nome: "Fernanda Costa",
    email: "fernanda.costa@exemplo.com",
    capital: 34200,
    incentivoAcumulado: 512.1,
    incentivoDisponivel: 0,
    desde: new Date(agora - 90 * dia),
  },
];

export default function PreviewAdminLiderancaPage() {
  return (
    <AdminPreviewShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Liderança</h1>
          <p className="mt-1 text-sm text-muted">
            Líderes recebem, além da rentabilidade diária normal, um incentivo de 0,10% ao dia
            sobre o próprio capital — lançado automaticamente toda vez que o PLR é liberado.
          </p>
        </div>
        <button className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black">
          + Promover líder
        </button>
      </div>
      <div className="mt-6">
        <LiderancaLista lideres={lideres} />
      </div>
    </AdminPreviewShell>
  );
}
