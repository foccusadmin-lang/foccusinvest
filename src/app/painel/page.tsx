import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PainelDashboard } from "@/components/painel/dashboard";
import { getResumoCarteira } from "@/lib/carteira";
import { janelaSaqueRendimentoAberta } from "@/lib/janela-saque";
import { obterLiberacaoAtivaDoUsuario } from "@/lib/emergencia";

export default async function PainelPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { pessoaFisica: true, pessoaJuridica: true },
  });
  if (!user) redirect("/login");

  // Checa os dados de verdade (CPF/CNPJ cadastrado), não só o status — uma conta pode ter
  // sido criada por outro caminho (ex: admin cria por e-mail) sem nunca preencher isso, e o
  // status sozinho não pega esse caso. Sem dado, cadastro obrigatório antes de mais nada.
  if (session.user.perfil !== "ADMIN" && !user.pessoaFisica && !user.pessoaJuridica) {
    redirect("/onboarding/cadastro");
  }

  const primeiroNome =
    user.pessoaFisica?.nomeCompleto.split(" ")[0] ??
    user.pessoaJuridica?.nomeFantasia ??
    user.name?.split(" ")[0] ??
    "Usuário";

  const resumo = await getResumoCarteira(user.id);
  const liberacaoEmergencial = await obterLiberacaoAtivaDoUsuario(user.id);

  const aportesAnteriores = await prisma.aplicacao.count({
    where: {
      userId: user.id,
      origem: "NOVA_APLICACAO",
      status: { in: ["CONFIRMADA", "SAQUE_SOLICITADO", "RETIRADA"] },
    },
  });

  return (
    <PainelDashboard
      usuario={{
        primeiroNome,
        foto: user.image,
        statusCadastro: user.statusCadastro,
        codigoIndicacao: user.codigoIndicacao,
        moeda: "BRL",
        ehAdmin: session.user.perfil === "ADMIN",
        liberacaoEmergencial,
        primeiroAporteElegivelIndicacao: aportesAnteriores === 0,
      }}
      resumo={resumo}
      janelaSaqueRendimentoAberta={janelaSaqueRendimentoAberta()}
    />
  );
}
