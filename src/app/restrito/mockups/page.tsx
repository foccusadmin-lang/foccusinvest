import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MockupsGallery, type MockupItem } from "./mockups-gallery";

const ITENS: MockupItem[] = [
  // Público
  { key: "home", label: "Página inicial", grupo: "Público", path: "/" },
  { key: "login", label: "Login", grupo: "Público", path: "/preview/login" },
  { key: "registrar", label: "Cadastro (Google)", grupo: "Público", path: "/preview/registrar" },
  { key: "restrito-negado", label: "Acesso restrito (sem login)", grupo: "Público", path: "/preview/restrito-negado" },
  { key: "termos", label: "Termos de uso", grupo: "Público", path: "/termos" },
  { key: "privacidade", label: "Política de privacidade", grupo: "Público", path: "/privacidade" },

  // Onboarding
  { key: "onboarding-termos", label: "Onboarding — aceite de termos", grupo: "Onboarding", path: "/preview/onboarding-termos" },
  { key: "onboarding-cadastro", label: "Onboarding — completar cadastro", grupo: "Onboarding", path: "/preview/onboarding-cadastro" },

  // Investidor
  { key: "painel", label: "Painel do investidor", grupo: "Investidor", path: "/preview/painel" },
  { key: "painel-historico", label: "Histórico", grupo: "Investidor", path: "/preview/painel-historico" },
  { key: "painel-contratos", label: "Meus contratos", grupo: "Investidor", path: "/preview/painel-contratos" },
  { key: "painel-contrato-detalhe", label: "Contrato (detalhe)", grupo: "Investidor", path: "/preview/painel-contrato-detalhe" },
  { key: "painel-doar", label: "Doar para uma entidade", grupo: "Investidor", path: "/preview/painel-doar" },
  { key: "painel-tutorial", label: "Tutorial", grupo: "Investidor", path: "/preview/painel-tutorial" },
  { key: "painel-configuracoes", label: "Configurações do investidor", grupo: "Investidor", path: "/preview/painel-configuracoes" },

  // Administrador
  { key: "admin-painel", label: "Painel administrativo", grupo: "Administrador", path: "/preview/admin-painel" },
  { key: "admin-usuarios", label: "Usuários", grupo: "Administrador", path: "/preview/admin-usuarios" },
  { key: "admin-lideranca", label: "Liderança", grupo: "Administrador", path: "/preview/admin-lideranca" },
  { key: "admin-aportes", label: "Aportes (Pix)", grupo: "Administrador", path: "/preview/admin-aportes" },
  { key: "admin-saques", label: "Saques", grupo: "Administrador", path: "/preview/admin-saques" },
  { key: "admin-distribuicoes", label: "Distribuições", grupo: "Administrador", path: "/preview/admin-distribuicoes" },
  { key: "admin-plr-individual", label: "PLR Individual", grupo: "Administrador", path: "/preview/admin-plr-individual" },
  { key: "admin-reaplicacoes", label: "Reaplicações", grupo: "Administrador", path: "/preview/admin-reaplicacoes" },
  { key: "admin-migracao", label: "Migração de saldo", grupo: "Administrador", path: "/preview/admin-migracao" },
  { key: "admin-historico", label: "Histórico completo", grupo: "Administrador", path: "/preview/admin-historico" },
  { key: "admin-entidades", label: "Entidades", grupo: "Administrador", path: "/preview/admin-entidades" },
  { key: "admin-doacoes", label: "Doações", grupo: "Administrador", path: "/preview/admin-doacoes" },
  { key: "admin-indicacoes", label: "Indicações", grupo: "Administrador", path: "/preview/admin-indicacoes" },
  { key: "admin-analises", label: "Gráficos e análises", grupo: "Administrador", path: "/preview/admin-analises" },
  { key: "admin-criar-usuario", label: "Criar por e-mail", grupo: "Administrador", path: "/preview/admin-criar-usuario" },
  { key: "admin-configuracoes", label: "Configurações do sistema", grupo: "Administrador", path: "/preview/admin-configuracoes" },
];

export default async function RestritoMockupsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Mockups do sistema</h1>
      <p className="mt-1 text-sm text-muted">
        Imagens de cada tela, com dados fictícios, prontas pra usar numa apresentação. Selecione
        as que quiser e baixe ou compartilhe — individualmente ou todas de uma vez.
      </p>

      <MockupsGallery itens={ITENS} />
    </div>
  );
}
