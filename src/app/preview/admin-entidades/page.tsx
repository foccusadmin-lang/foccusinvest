import { EntidadesLista, type EntidadeLinha } from "@/app/restrito/entidades/entidades-lista";
import { AdminPreviewShell } from "../_admin-shell";

const entidades: EntidadeLinha[] = [
  {
    id: "e1",
    nome: "Ministério Apostólico Refrigério",
    email: "contato@refrigerio.exemplo.com",
    tipoEntidade: "IGREJA",
    cnpj: "17847125000154",
    saldoAtual: 4380.99,
    taxaAtivacao: 100,
    status: "ATIVA",
    documentosAprovados: true,
    termosAceitos: true,
    chavePix: "17.847.125/0001-54",
    pendencias: [],
  },
  {
    id: "e2",
    nome: "Instituto Mãos que Ajudam",
    email: "contato@maosqueajudam.exemplo.com",
    tipoEntidade: "ONG",
    cnpj: "12345678000199",
    saldoAtual: 0,
    taxaAtivacao: 100,
    status: "EM_ANALISE",
    documentosAprovados: false,
    termosAceitos: true,
    chavePix: null,
    pendencias: ["Documentos aguardando aprovação", "Saldo insuficiente para ativação"],
  },
];

export default function PreviewAdminEntidadesPage() {
  return (
    <AdminPreviewShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Entidades</h1>
          <p className="mt-1 text-sm text-muted">
            Igrejas, ONGs, associações, institutos e projetos sociais habilitados a receber
            doações e novas aplicações.
          </p>
        </div>
      </div>
      <div className="mt-6">
        <EntidadesLista entidades={entidades} />
      </div>
    </AdminPreviewShell>
  );
}
