import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/logo";
import { getResumoCarteira } from "@/lib/carteira";
import { EntidadesLista, type EntidadeCard } from "./entidades-lista";

const TIPO_LABEL: Record<string, string> = {
  IGREJA: "Igreja",
  ONG: "ONG",
  ASSOCIACAO: "Associação",
  INSTITUTO: "Instituto",
  PROJETO_SOCIAL: "Projeto social",
  OUTRO: "Outro",
};

export default async function DoarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [entidades, resumo] = await Promise.all([
    prisma.entidade.findMany({
      where: { status: "ATIVA" },
      include: { user: { include: { pessoaJuridica: true } } },
      orderBy: { dataAtivacao: "desc" },
    }),
    getResumoCarteira(session.user.id),
  ]);

  const saldoDisponivel = resumo.distribuicoesDisponiveis + resumo.bonusIndicacao;

  const cards: EntidadeCard[] = entidades
    .filter((e) => e.user.pessoaJuridica)
    .map((e) => ({
      id: e.id,
      nome: e.user.pessoaJuridica!.nomeFantasia ?? e.user.pessoaJuridica!.razaoSocial,
      tipo: TIPO_LABEL[e.tipoEntidade] ?? e.tipoEntidade,
      cnpj: e.user.pessoaJuridica!.cnpj,
      cidade: e.cidade,
      estado: e.estado,
      descricao: e.descricao,
      logoUrl: e.logoUrl,
      podeReceberDoacao: e.podeReceberDoacao,
      podeReceberAplicacao: e.podeReceberAplicacao,
    }));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/80 bg-ink/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo size={30} />
          <Link href="/painel" className="text-sm text-muted hover:text-gold-light">
            Voltar ao painel
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-foreground">Doar para uma entidade</h1>
        <p className="mt-1 text-sm text-muted">
          Igrejas, ONGs, associações, institutos e projetos sociais verificados pela Foccus
          Invest.
        </p>

        <EntidadesLista entidades={cards} saldoDisponivel={saldoDisponivel} />
      </main>
    </div>
  );
}
