import { SecoesPainelToggles } from "@/app/restrito/estrategia/secoes-painel-toggles";
import { AdminPreviewShell } from "../_admin-shell";

export default function PreviewAdminEstrategiaPage() {
  return (
    <AdminPreviewShell>
      <h1 className="text-2xl font-bold text-foreground">Vitrine de Operação</h1>
      <p className="mt-1 text-sm text-muted">
        Configure a estratégia exibida no painel dos investidores e lance a variação percentual de
        cada dia.
      </p>
      <div className="mt-6">
        <SecoesPainelToggles
          inicial={{
            mostrarEstrategia: true,
            mostrarComparativo: true,
            mostrarPerfilOperacao: false,
            mostrarEvolucaoRendimentos: true,
            mostrarRentabilidadeIndices: true,
          }}
        />
      </div>
    </AdminPreviewShell>
  );
}
