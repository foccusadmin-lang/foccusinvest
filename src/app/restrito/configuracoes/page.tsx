import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getConfiguracao } from "@/lib/configuracao";
import { ControleSaques } from "../painel/controle-saques";

export default async function RestritoConfiguracoesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const configuracao = await getConfiguracao();

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Configurações do Sistema</h1>
      <p className="mt-1 text-sm text-muted">
        Controle como saques e verificação de cadastro são processados na plataforma.
      </p>

      <div className="mt-6">
        <ControleSaques
          modoSaqueCapital={configuracao.modoSaqueCapital}
          modoSaqueRendimento={configuracao.modoSaqueRendimento}
          modoVerificacaoCadastro={configuracao.modoVerificacaoCadastro}
          modoIncentivoLideranca={configuracao.modoIncentivoLideranca}
          modoBonusIndicacao={configuracao.modoBonusIndicacao}
          modoAprovacaoAporte={configuracao.modoAprovacaoAporte}
          valorMaximoAprovacaoAutomatica={configuracao.valorMaximoAprovacaoAutomatica}
          aplicacaoBensAtiva={configuracao.aplicacaoBensAtiva}
          cidadePagamentoPix={configuracao.cidadePagamentoPix}
          saquePagaMesmaSexta={configuracao.saquePagaMesmaSexta}
          modoPLR={configuracao.modoPLR}
        />
      </div>
    </div>
  );
}
