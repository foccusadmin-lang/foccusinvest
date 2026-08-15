import { ControleSaques } from "@/app/restrito/painel/controle-saques";
import { AdminPreviewShell } from "../_admin-shell";

export default function PreviewAdminConfiguracoesPage() {
  return (
    <AdminPreviewShell>
      <h1 className="text-2xl font-bold text-foreground">Configurações do Sistema</h1>
      <p className="mt-1 text-sm text-muted">
        Controle como saques e verificação de cadastro são processados na plataforma.
      </p>
      <div className="mt-6">
        <ControleSaques
          modoSaqueCapital="AUTOMATICO"
          modoSaqueRendimento="MANUAL"
          modoVerificacaoCadastro="MANUAL"
          modoIncentivoLideranca="MANUAL"
          modoBonusIndicacao="MANUAL"
        />
      </div>
    </AdminPreviewShell>
  );
}
