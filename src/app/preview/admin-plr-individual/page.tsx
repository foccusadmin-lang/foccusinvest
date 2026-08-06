import { PlrIndividualForm } from "@/app/restrito/plr-individual/plr-form";
import { LancamentosRecentes } from "@/app/restrito/plr-individual/lancamentos-recentes";
import { AdminPreviewShell } from "../_admin-shell";

const usuarios = [
  { id: "u1", nome: "Waldir Rodrigues Custódio", email: "waldir.custodio@exemplo.com", codigo: "7K2QX-WALDIR", capital: 12500 },
  { id: "u2", nome: "Marina Souza Almeida", email: "marina.almeida@exemplo.com", codigo: "9B7TZ-MARINA", capital: 34200 },
];

export default function PreviewAdminPlrIndividualPage() {
  return (
    <AdminPreviewShell>
      <h1 className="text-2xl font-bold text-foreground">PLR Individual</h1>
      <p className="mt-1 text-sm text-muted">
        Aplique um percentual de PLR sobre o capital de cada investidor selecionado — um por um ou
        todos de uma vez.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <PlrIndividualForm usuarios={usuarios} />
      </div>

      <p className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
        Lançamentos (todos, agrupados por data)
      </p>
      <LancamentosRecentes lancamentos={[]} />
    </AdminPreviewShell>
  );
}
