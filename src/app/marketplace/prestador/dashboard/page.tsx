import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calcularCompletudePerfilPrestador } from "@/lib/marketplace/prestador";

export default async function PrestadorDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/marketplace/prestador/dashboard");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      perfilPrestador: {
        include: {
          regiaoPrincipal: true,
          regioesAtendidas: { include: { regiao: true }, orderBy: { regiao: { nome: "asc" } } },
        },
      },
    },
  });
  if (!user) redirect("/login");
  if (user.papelMarketplace !== "PRESTADOR") redirect("/marketplace");
  // Todo prestador ganha um PerfilPrestador ao escolher o papel (ver aplicarPapelMarketplace);
  // se por algum motivo não existir, manda de volta pra escolha em vez de quebrar a página.
  if (!user.perfilPrestador) redirect("/marketplace");

  const perfil = user.perfilPrestador;
  const primeiroNome = user.name?.split(" ")[0] ?? "prestador(a)";

  const [solicitacoesNovas, servicosConcluidos, avaliacoes] = await Promise.all([
    prisma.solicitacaoServico.count({
      where: { prestadorId: perfil.id, status: "PENDENTE" },
    }),
    prisma.solicitacaoServico.count({
      where: { prestadorId: perfil.id, status: "CONCLUIDA" },
    }),
    prisma.avaliacaoServico.aggregate({
      where: { prestadorId: perfil.id },
      _avg: { nota: true },
      _count: true,
    }),
  ]);

  const completude = calcularCompletudePerfilPrestador(perfil);
  const notaMedia = avaliacoes._avg.nota;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Olá, {primeiroNome}!</h1>
        <p className="mt-1 text-sm text-muted">{perfil.nomeProfissional}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Solicitações novas" valor={String(solicitacoesNovas)} />
        <Stat label="Serviços concluídos" valor={String(servicosConcluidos)} />
        <Stat
          label="Avaliação"
          valor={notaMedia ? `⭐ ${notaMedia.toFixed(1)}` : "—"}
          detalhe={avaliacoes._count > 0 ? `${avaliacoes._count} avaliações` : "Sem avaliações ainda"}
        />
        <Stat label="Perfil" valor={`${completude}%`} detalhe="completo" />
      </div>

      {perfil.regioesAtendidas.length === 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          Você ainda não escolheu onde atende — sem isso, você não aparece nas buscas dos
          clientes por bairro.{" "}
          <Link href="/marketplace/prestador/regiao" className="font-semibold underline">
            Escolher onde atendo
          </Link>
        </div>
      )}

      {!perfil.ativo && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          Seu perfil ainda não está publicado — ele não aparece nas buscas dos clientes até ser
          ativado. A edição completa do perfil (fotos, serviços, preço) chega na próxima etapa.
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Solicitações
        </h2>
        <div className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Nenhuma solicitação ainda. Assim que um cliente pedir seu serviço, ela aparece aqui.
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Meu perfil</h2>
          <Link
            href="/marketplace/prestador/regiao"
            className="text-xs font-medium text-sky-300 hover:underline"
          >
            Editar região
          </Link>
        </div>
        <dl className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-border bg-surface p-5 text-sm sm:grid-cols-2">
          <Campo rotulo="Nome profissional" valor={perfil.nomeProfissional} />
          <Campo rotulo="Cidade" valor={`${perfil.cidade} - ${perfil.estado}`} />
          <Campo rotulo="Mora em" valor={perfil.regiaoPrincipal?.nome ?? null} />
          <Campo rotulo="Telefone" valor={perfil.telefone} />
          <Campo rotulo="Verificado" valor={perfil.verificado ? "Sim ✓" : "Ainda não"} />
        </dl>

        <div className="mt-3 rounded-xl border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-muted">
            Atende {perfil.regioesAtendidas.length}{" "}
            {perfil.regioesAtendidas.length === 1 ? "bairro" : "bairros"}
          </p>
          {perfil.regioesAtendidas.length === 0 ? (
            <p className="mt-1 text-sm text-muted">Nenhum bairro selecionado ainda.</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {perfil.regioesAtendidas.map(({ regiao }) => (
                <span
                  key={regiao.id}
                  className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs text-sky-200"
                >
                  📍 {regiao.nome}
                </span>
              ))}
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-muted">
          Edição completa do perfil (descrição, foto, serviços oferecidos e preço) chega na
          próxima etapa.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, valor, detalhe }: { label: string; valor: string; detalhe?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-4">
      <p className="text-xl font-bold text-foreground">{valor}</p>
      <p className="text-xs text-muted">{label}</p>
      {detalhe && <p className="text-[11px] text-muted/70">{detalhe}</p>}
    </div>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{rotulo}</dt>
      <dd className="mt-0.5 text-foreground">{valor || "Não preenchido"}</dd>
    </div>
  );
}
