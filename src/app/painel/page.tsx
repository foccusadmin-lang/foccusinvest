import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PainelDashboard } from "@/components/painel/dashboard";
import { getResumoCarteira } from "@/lib/carteira";
import { janelaSaqueRendimentoAberta } from "@/lib/janela-saque";

export default async function PainelPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (session.user.perfil !== "ADMIN" && session.user.statusCadastro === "INCOMPLETO") {
    redirect("/onboarding/cadastro");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { pessoaFisica: true, pessoaJuridica: true },
  });
  if (!user) redirect("/login");

  const primeiroNome =
    user.pessoaFisica?.nomeCompleto.split(" ")[0] ??
    user.pessoaJuridica?.nomeFantasia ??
    user.name?.split(" ")[0] ??
    "Usuário";

  const resumo = await getResumoCarteira(user.id);

  return (
    <PainelDashboard
      usuario={{
        primeiroNome,
        foto: user.image,
        statusCadastro: user.statusCadastro,
        codigoIndicacao: user.codigoIndicacao,
        moeda: "BRL",
        ehAdmin: session.user.perfil === "ADMIN",
      }}
      resumo={resumo}
      janelaSaqueRendimentoAberta={janelaSaqueRendimentoAberta()}
    />
  );
}
