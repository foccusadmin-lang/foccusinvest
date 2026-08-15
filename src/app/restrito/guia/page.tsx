import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatData } from "@/lib/format";
import { NovaFaqForm } from "./nova-faq-form";
import { ExcluirFaqButton } from "./excluir-faq-button";

const TRINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000;

export default async function RestritoGuiaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const desde = new Date(Date.now() - TRINTA_DIAS_MS);

  const [porTopico, totalPerguntas, recentes, faqs] = await Promise.all([
    prisma.mensagemGuia.groupBy({
      by: ["topico"],
      where: { papel: "USER", criadoEm: { gte: desde } },
      _count: { topico: true },
      orderBy: { _count: { topico: "desc" } },
    }),
    prisma.mensagemGuia.count({ where: { papel: "USER", criadoEm: { gte: desde } } }),
    prisma.mensagemGuia.findMany({
      where: { papel: "USER" },
      orderBy: { criadoEm: "desc" },
      take: 40,
      include: { user: { select: { name: true, email: true, pessoaFisica: { select: { nomeCompleto: true } } } } },
    }),
    prisma.faqGuia.findMany({ orderBy: { topico: "asc" } }),
  ]);

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Guia Foccus</h1>
        <p className="mt-1 text-sm text-muted">
          Acompanhe o que os investidores mais perguntam pro assistente e curadoria manualmente
          as respostas mais importantes — a FAQ abaixo entra direto no contexto do Gemini.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-wider text-muted">Últimos 30 dias</p>
          <p className="mt-1 text-2xl font-bold text-gold-light">{totalPerguntas}</p>
          <p className="text-xs text-muted">perguntas feitas ao Guia Foccus</p>

          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted">
            Tópicos mais frequentes
          </p>
          {porTopico.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nenhuma pergunta registrada ainda.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {porTopico.map((t) => (
                <div key={t.topico ?? "sem-topico"} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-foreground/90">{t.topico ?? "Não classificado"}</span>
                  <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold-light">
                    {t._count.topico}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Adicionar FAQ curada
          </p>
          <p className="mt-1 text-xs text-muted">
            Vira referência preferencial do assistente pra perguntas parecidas com essa.
          </p>
          <div className="mt-3">
            <NovaFaqForm />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          FAQ curada ({faqs.length})
        </p>
        {faqs.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nenhuma FAQ cadastrada ainda.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {faqs.map((f) => (
              <div key={f.id} className="rounded-xl border border-border bg-surface-2 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold-light">
                      {f.topico}
                    </span>
                    <p className="mt-1.5 text-sm font-medium text-foreground">{f.pergunta}</p>
                    <p className="mt-1 text-sm text-muted">{f.resposta}</p>
                  </div>
                  <ExcluirFaqButton id={f.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          Perguntas recentes ({recentes.length})
        </p>
        {recentes.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Ninguém usou o Guia Foccus ainda.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {recentes.map((m) => (
              <div
                key={m.id}
                className="flex flex-col gap-1 rounded-lg border border-border/70 bg-surface-2 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground/90">{m.texto}</p>
                  <p className="text-[11px] text-muted">
                    {m.user.pessoaFisica?.nomeCompleto ?? m.user.name ?? m.user.email} · {formatData(m.criadoEm)}
                  </p>
                </div>
                {m.topico && (
                  <span className="shrink-0 self-start rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-muted sm:self-center">
                    {m.topico}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
