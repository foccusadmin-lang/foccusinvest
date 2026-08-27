import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { listarRegioesAtivas } from "@/lib/marketplace/regioes";
import { calcularCompletudePerfilPrestador } from "@/lib/marketplace/prestador";
import { RegiaoPicker } from "@/components/marketplace/regiao-picker";
import { SugerirBairroForm, SugestaoEnviadaBanner } from "@/components/marketplace/sugerir-bairro";

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ servico?: string; regiao?: string; sugestaoEnviada?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/marketplace/cliente/buscar");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");
  if (user.papelMarketplace !== "CLIENTE") redirect("/marketplace");

  const { servico: servicoSlug, regiao: regiaoId, sugestaoEnviada } = await searchParams;

  const [servicos, regioes] = await Promise.all([
    prisma.servico.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    listarRegioesAtivas(),
  ]);
  const regioesOpcoes = regioes.map((r) => ({ id: r.id, nome: r.nome }));

  const servicoSelecionado = servicoSlug
    ? await prisma.servico.findUnique({ where: { slug: servicoSlug } })
    : null;
  const regiaoSelecionada = regiaoId ? regioes.find((r) => r.id === regiaoId) : null;

  const resultados =
    servicoSelecionado && regiaoSelecionada
      ? await buscarPrestadores(servicoSelecionado.id, regiaoSelecionada.id)
      : null;

  return (
    <div className="flex flex-col gap-8">
      {sugestaoEnviada && <SugestaoEnviadaBanner />}

      <div>
        <h1 className="text-2xl font-bold text-foreground">O que você precisa?</h1>
      </div>

      <form method="get" className="flex flex-col gap-6 rounded-xl border border-border bg-surface p-5">
        <div>
          <label className="text-xs uppercase tracking-wide text-muted">Serviço</label>
          <select
            name="servico"
            defaultValue={servicoSlug ?? ""}
            required
            className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-foreground"
          >
            <option value="" disabled>
              Selecione um serviço
            </option>
            {servicos.map((s) => (
              <option key={s.id} value={s.slug}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-muted">Onde você precisa?</label>
          <div className="mt-1">
            <RegiaoPicker
              regioes={regioesOpcoes}
              name="regiao"
              selecionadasIniciais={regiaoSelecionada ? [regiaoSelecionada.id] : []}
            />
          </div>
          <SugerirBairroForm voltarPara="/marketplace/cliente/buscar" />
        </div>

        <Button type="submit" variant="gold" className="w-full">
          Pesquisar
        </Button>
      </form>

      {resultados && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {servicoSelecionado!.nome}s encontrados em {regiaoSelecionada!.nome}
          </h2>

          {resultados.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
              Nenhum prestador de {servicoSelecionado!.nome.toLowerCase()} atende{" "}
              {regiaoSelecionada!.nome} ainda.
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {resultados.map((p) => (
                <div key={p.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">
                      {p.nomeProfissional} {p.verificado && <span className="text-sky-300">✓</span>}
                    </p>
                    <p className="text-sm text-muted">
                      {p.notaMedia ? `⭐ ${p.notaMedia.toFixed(1)}` : "Ainda sem avaliações"}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    📍 {p.regiaoPrincipal?.nome ?? "Bairro não informado"} · atende{" "}
                    {p.totalRegioesAtendidas} bairro{p.totalRegioesAtendidas === 1 ? "" : "s"}
                  </p>
                  {p.precoDe && (
                    <p className="mt-1 text-sm text-muted">A partir de R$ {p.precoDe.toFixed(0)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-muted">
            Perfil detalhado e solicitação direta pelo app chegam na próxima etapa — por
            enquanto, esses são os prestadores que já atendem esse bairro.
          </p>
        </div>
      )}
    </div>
  );
}

async function buscarPrestadores(servicoId: string, regiaoId: string) {
  const prestadores = await prisma.perfilPrestador.findMany({
    where: {
      ativo: true,
      servicos: { some: { servicoId } },
      regioesAtendidas: { some: { regiaoId } },
    },
    include: {
      regiaoPrincipal: true,
      regioesAtendidas: true,
      avaliacoesRecebidas: { select: { nota: true } },
    },
  });

  const comMetricas = prestadores.map((p) => {
    const notas = p.avaliacoesRecebidas.map((a) => a.nota);
    const notaMedia = notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
    return {
      ...p,
      notaMedia,
      totalRegioesAtendidas: p.regioesAtendidas.length,
      completude: calcularCompletudePerfilPrestador(p),
    };
  });

  // Ordem dos resultados (spec "Parte 2", seção 10): já filtrado por ativo=true; depois
  // verificado > avaliação > perfil completo. "Disponibilidade" fica pra quando existir esse
  // campo, e "distância" só quando o Google Maps entrar (seção 20).
  comMetricas.sort((a, b) => {
    if (a.verificado !== b.verificado) return a.verificado ? -1 : 1;
    const notaA = a.notaMedia ?? -1;
    const notaB = b.notaMedia ?? -1;
    if (notaA !== notaB) return notaB - notaA;
    return b.completude - a.completude;
  });

  return comMetricas;
}
