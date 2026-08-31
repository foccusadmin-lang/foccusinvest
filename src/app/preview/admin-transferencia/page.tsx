import { TransferenciaForm, type UsuarioTransferencia } from "@/app/restrito/transferencia/transferencia-form";
import { AdminPreviewShell } from "../_admin-shell";

const usuarios: UsuarioTransferencia[] = [
  { id: "u1", nome: "Waldir Rodrigues Custódio", email: "waldir.custodio@exemplo.com", capital: 3200 },
  { id: "u2", nome: "Marina Souza Almeida", email: "marina.almeida@exemplo.com", capital: 850.5 },
  { id: "u3", nome: "Carlos Eduardo Lima", email: "carlos.lima@exemplo.com", capital: 12500 },
  { id: "u4", nome: "Fernanda Costa", email: "fernanda.costa@exemplo.com", capital: 0 },
];

export default function PreviewAdminTransferenciaPage() {
  return (
    <AdminPreviewShell>
      <h1 className="text-2xl font-bold text-foreground">Transferência de Saldo</h1>
      <p className="mt-1 text-sm text-muted">
        Move capital de um investidor pra outro. Só entre contas ativas (cadastro verificado).
      </p>
      <TransferenciaForm usuarios={usuarios} />
    </AdminPreviewShell>
  );
}
