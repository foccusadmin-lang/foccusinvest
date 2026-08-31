import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PainelDashboard } from "@/components/painel/dashboard";
import { getResumoCarteira } from "@/lib/carteira";
import { janelaSaqueRendimentoAberta } from "@/lib/janela-saque";
import { obterLiberacaoAtivaDoUsuario } from "@/lib/emergencia";
import { getConfiguracao } from "@/lib/configuracao";
import { obterVitrineOperacaoAtiva } from "@/lib/estrategia";

export default async function PainelPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      pessoaFisica: true,
      pessoaJuridica: true,
      indicadoPor: { select: { codigoIndicacao: true } },
    },
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
  const configuracao = await getConfiguracao();
  const vitrineOperacao = await obterVitrineOperacaoAtiva();

  const aportesAnteriores = await prisma.aplicacao.count({
    where: {
      userId: user.id,
      origem: "NOVA_APLICACAO",
      status: { in: ["CONFIRMADA", "SAQUE_SOLICITADO", "RETIRADA"] },
    },
  });

  const ehLider = session.user.perfil === "LIDER";
  const indicadosDiretos = ehLider
    ? (
        await prisma.user.findMany({
          where: { indicadoPorId: user.id },
          include: { pessoaFisica: true, pessoaJuridica: true },
          orderBy: { createdAt: "desc" },
        })
      ).map((u) => ({
        id: u.id,
        nome: u.pessoaFisica?.nomeCompleto ?? u.pessoaJuridica?.razaoSocial ?? u.name ?? u.email,
        email: u.email,
        statusCadastro: u.statusCadastro,
        criadoEm: u.createdAt,
      }))
    : [];

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
        codigoIndicadorFixo: user.indicadoPor?.codigoIndicacao ?? null,
        modoBonusIndicacao: configuracao.modoBonusIndicacao,
        ehLider,
        indicadosDiretos,
        aplicacaoBensAtiva: configuracao.aplicacaoBensAtiva,
        reaplicacaoAutomatica: user.reaplicacaoAutomatica,
      }}
      resumo={resumo}
      janelaSaqueRendimentoAberta={janelaSaqueRendimentoAberta()}
      vitrineOperacao={
        vitrineOperacao
          ? {
              ...vitrineOperacao,
              serieComparativo: vitrineOperacao.serieComparativo.map((p) => ({
                data: p.data.toISOString().slice(0, 10),
                acumulado: p.acumulado,
              })),
            }
          : null
      }
    />
  );
}
