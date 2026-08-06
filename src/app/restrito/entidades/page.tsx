import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checarRequisitosAtivacao } from "@/lib/entidades";
import { CriarEntidadeButton } from "./criar-entidade-form";
import { ConverterUsuarioButton } from "./converter-usuario-form";
import { EntidadesLista, type EntidadeLinha } from "./entidades-lista";

export default async function RestritoEntidadesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const entidades = await prisma.entidade.findMany({
    include: { user: { include: { pessoaJuridica: true } } },
    orderBy: { createdAt: "desc" },
  });

  const linhas: EntidadeLinha[] = await Promise.all(
    entidades.map(async (e) => {
      const pj = e.user.pessoaJuridica;
      const requisitos = await checarRequisitosAtivacao(e.id);
      return {
        id: e.id,
        nome: pj?.nomeFantasia ?? pj?.razaoSocial ?? e.user.name ?? e.user.email,
        email: e.user.email,
        tipoEntidade: e.tipoEntidade,
        cnpj: pj?.cnpj ?? null,
        saldoAtual: requisitos.saldoAtual,
        taxaAtivacao: e.taxaAtivacao,
        status: e.status,
        documentosAprovados: e.documentosAprovados,
        termosAceitos: e.termosAceitos,
        chavePix: e.chavePix,
        pendencias: requisitos.elegivel ? [] : requisitos.pendencias,
      };
    })
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Entidades</h1>
          <p className="mt-1 text-sm text-muted">
            Igrejas, ONGs, associações, institutos e projetos sociais habilitados a receber
            doações e novas aplicações.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ConverterUsuarioButton />
          <CriarEntidadeButton />
        </div>
      </div>

      <div className="mt-6">
        <EntidadesLista entidades={linhas} />
      </div>
    </div>
  );
}
