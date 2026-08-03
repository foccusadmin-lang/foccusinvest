import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda } from "@/lib/format";
import { formatCNPJ } from "@/lib/cpf-cnpj";
import { checarRequisitosAtivacao } from "@/lib/entidades";
import { CriarEntidadeButton } from "./criar-entidade-form";
import { ConverterUsuarioButton } from "./converter-usuario-form";
import { EntidadeLinhaAcoes } from "./linha-acoes";

const TIPO_LABEL: Record<string, string> = {
  IGREJA: "Igreja",
  ONG: "ONG",
  ASSOCIACAO: "Associação",
  INSTITUTO: "Instituto",
  PROJETO_SOCIAL: "Projeto social",
  OUTRO: "Outro",
};

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  CADASTRO_INCOMPLETO: { label: "Cadastro incompleto", className: "bg-white/10 text-muted" },
  AGUARDANDO_DOCUMENTOS: { label: "Aguardando documentos", className: "bg-amber-500/15 text-amber-300" },
  EM_ANALISE: { label: "Em análise", className: "bg-sky-500/15 text-sky-300" },
  AGUARDANDO_SALDO_ATIVACAO: { label: "Aguardando saldo", className: "bg-amber-500/15 text-amber-300" },
  APROVADA: { label: "Aprovada", className: "bg-sky-500/15 text-sky-300" },
  ATIVA: { label: "Ativa", className: "bg-emerald-500/15 text-emerald-300" },
  BLOQUEADA: { label: "Bloqueada", className: "bg-red-500/15 text-red-300" },
  SUSPENSA: { label: "Suspensa", className: "bg-red-500/15 text-red-300" },
  INATIVA: { label: "Inativa", className: "bg-white/10 text-muted" },
};

export default async function RestritoEntidadesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const entidades = await prisma.entidade.findMany({
    include: { user: { include: { pessoaJuridica: true } } },
    orderBy: { createdAt: "desc" },
  });

  const requisitosPorId = new Map(
    await Promise.all(
      entidades.map(async (e) => [e.id, await checarRequisitosAtivacao(e.id)] as const)
    )
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

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Entidade</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">CNPJ</th>
              <th className="px-4 py-3">Saldo</th>
              <th className="px-4 py-3">Taxa ativação</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entidades.map((e) => {
              const pj = e.user.pessoaJuridica;
              const status = STATUS_LABEL[e.status] ?? { label: e.status, className: "bg-white/10 text-muted" };
              const requisitos = requisitosPorId.get(e.id);
              return (
                <tr key={e.id} className="bg-surface align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{pj?.nomeFantasia ?? pj?.razaoSocial ?? e.user.name}</p>
                    <p className="text-xs text-muted">{e.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">{TIPO_LABEL[e.tipoEntidade] ?? e.tipoEntidade}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {pj ? formatCNPJ(pj.cnpj) : "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-300">
                    {formatMoeda(requisitos?.saldoAtual ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-muted">{formatMoeda(e.taxaAtivacao)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <EntidadeLinhaAcoes
                      entidade={{
                        id: e.id,
                        nome: pj?.nomeFantasia ?? pj?.razaoSocial ?? e.user.name ?? e.user.email,
                        status: e.status,
                        documentosAprovados: e.documentosAprovados,
                        termosAceitos: e.termosAceitos,
                        taxaAtivacao: e.taxaAtivacao,
                        chavePix: e.chavePix,
                      }}
                      pendencias={requisitos?.elegivel ? [] : (requisitos?.pendencias ?? [])}
                    />
                  </td>
                </tr>
              );
            })}
            {entidades.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  Nenhuma entidade cadastrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
