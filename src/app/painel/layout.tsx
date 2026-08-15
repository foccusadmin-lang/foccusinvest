import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ChatGuia } from "@/components/painel/chat-guia";
import { TourGuiado } from "@/components/painel/tour-guiado";

/** Layout compartilhado por todas as páginas de /painel — só acrescenta o Guia Foccus (chat) e
 *  o tour guiado por cima do que cada página já renderiza. Não faz nenhum redirect próprio:
 *  cada página continua responsável pela sua própria checagem de sessão/cadastro (algumas têm
 *  destinos diferentes, ex: /painel manda pra /onboarding/cadastro). Aqui só decide se mostra
 *  os widgets, com uma checagem leve de sessão. */
export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  let primeiroNome = "investidor(a)";
  let novato = true;
  let tourAtivo = false;

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { pessoaFisica: true, pessoaJuridica: true },
    });

    if (user) {
      primeiroNome =
        user.pessoaFisica?.nomeCompleto.split(" ")[0] ??
        user.pessoaJuridica?.nomeFantasia?.split(" ")[0] ??
        user.name?.split(" ")[0] ??
        "investidor(a)";

      const aportesAnteriores = await prisma.aplicacao.count({
        where: {
          userId: user.id,
          origem: "NOVA_APLICACAO",
          status: { in: ["CONFIRMADA", "SAQUE_SOLICITADO", "RETIRADA"] },
        },
      });
      novato = aportesAnteriores === 0;
      tourAtivo = !user.tourConcluido;
    }
  }

  return (
    <>
      {children}
      {session?.user?.id && (
        <>
          <ChatGuia primeiroNome={primeiroNome} novato={novato} />
          <TourGuiado ativoInicial={tourAtivo} />
        </>
      )}
    </>
  );
}
