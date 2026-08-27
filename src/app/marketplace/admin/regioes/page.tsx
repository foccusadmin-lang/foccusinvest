import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button, LinkButton } from "@/components/ui/button";
import { IconShield } from "@/components/icons";
import { MARKETPLACE_CITY, MARKETPLACE_STATE } from "@/lib/marketplace/config";
import { criarRegiao, alternarAtivoRegiao, aprovarSugestao, rejeitarSugestao } from "./actions";

export default async function AdminRegioesPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const session = await auth();
  const isAdmin = session?.user?.perfil === "ADMIN";

  if (!isAdmin) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
          <IconShield width={22} height={22} />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-foreground">
          Área exclusiva para administradores autorizados
        </h1>
        <div className="mt-6">
          <LinkButton
            href={`/login?callbackUrl=${encodeURIComponent("/marketplace/admin/regioes")}`}
            variant="outline"
          >
            Entrar como administrador
          </LinkButton>
        </div>
      </div>
    );
  }

  const { msg } = await searchParams;
  const [regioes, sugestoesPendentes] = await Promise.all([
    prisma.regiao.findMany({
      where: { cidade: MARKETPLACE_CITY },
      orderBy: { nome: "asc" },
    }),
    prisma.sugestaoRegiao.findMany({
      where: { status: "PENDENTE" },
      include: { enviadoPor: { select: { name: true, email: true } } },
      orderBy: { criadoEm: "asc" },
    }),
  ]);

  const ativos = regioes.filter((r) => r.ativo).length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {MARKETPLACE_CITY} - {MARKETPLACE_STATE}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Bairros cadastrados: {regioes.length} ({ativos} ativos)
        </p>
      </div>

      {msg && (
        <div className="rounded-xl border border-sky-400/30 bg-sky-400/10 p-4 text-sm text-sky-200">
          {msg}
        </div>
      )}

      {sugestoesPendentes.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Sugestões pendentes ({sugestoesPendentes.length})
          </h2>
          <div className="mt-3 flex flex-col gap-3">
            {sugestoesPendentes.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{s.nome}</p>
                  <p className="text-xs text-muted">
                    {s.cidade} - {s.estado} · enviado por {s.enviadoPor.name ?? s.enviadoPor.email}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={aprovarSugestao}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" variant="outline" className="border-emerald-500/40 text-emerald-300">
                      Aprovar
                    </Button>
                  </form>
                  <form action={rejeitarSugestao}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" variant="outline" className="border-red-500/40 text-red-300">
                      Rejeitar
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">+ Novo bairro</h2>
        <form
          action={criarRegiao}
          className="mt-3 flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label className="text-xs uppercase tracking-wide text-muted">Nome do bairro</label>
            <input
              type="text"
              name="nome"
              required
              placeholder="Ex.: Jardim Bonança"
              className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-foreground placeholder:text-muted"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" name="ativo" defaultChecked className="h-4 w-4 accent-sky-400" />
            Ativo
          </label>
          <Button type="submit" variant="gold">
            Salvar
          </Button>
        </form>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Bairros</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {regioes.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted">
                    Nenhum bairro cadastrado ainda.
                  </td>
                </tr>
              )}
              {regioes.map((regiao) => (
                <tr key={regiao.id} className="border-t border-border">
                  <td className="px-4 py-3 text-foreground">{regiao.nome}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        regiao.ativo
                          ? "rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300"
                          : "rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-300"
                      }
                    >
                      {regiao.ativo ? "ATIVO" : "DESATIVADO"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/marketplace/admin/regioes/${regiao.id}/editar`}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-sky-400/60 hover:text-sky-300"
                      >
                        Editar
                      </Link>
                      <form action={alternarAtivoRegiao}>
                        <input type="hidden" name="id" value={regiao.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-red-400/60 hover:text-red-300"
                        >
                          {regiao.ativo ? "Desativar" : "Ativar"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
