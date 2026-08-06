import { IndicacoesLista } from "@/app/restrito/indicacoes/indicacoes-lista";
import { AdminPreviewShell } from "../_admin-shell";

const usuarios = [
  {
    id: "u1",
    name: "Waldir Rodrigues Custódio",
    email: "waldir.custodio@exemplo.com",
    codigoIndicacao: "7K2QX-WALDIR",
    indicadoPor: null,
    indicados: [{ id: "u2" }, { id: "u3" }],
  },
  {
    id: "u2",
    name: "Marina Souza Almeida",
    email: "marina.almeida@exemplo.com",
    codigoIndicacao: "9B7TZ-MARINA",
    indicadoPor: { name: "Waldir Rodrigues Custódio", email: "waldir.custodio@exemplo.com", codigoIndicacao: "7K2QX-WALDIR" },
    indicados: [],
  },
];

const bonusPorId = new Map<string, number>([
  ["u1", 250],
  ["u2", 0],
]);

export default function PreviewAdminIndicacoesPage() {
  return (
    <AdminPreviewShell>
      <h1 className="text-2xl font-bold text-foreground">Indicações</h1>
      <p className="mt-1 text-sm text-muted">Rede de indicações e bônus pago a cada investidor.</p>
      <div className="mt-6">
        <IndicacoesLista usuarios={usuarios} bonusPorId={bonusPorId} />
      </div>
    </AdminPreviewShell>
  );
}
