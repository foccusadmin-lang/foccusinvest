import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button, LinkButton } from "@/components/ui/button";
import { IconShield } from "@/components/icons";
import { atualizarRegiao } from "../../actions";

export default async function EditarRegiaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
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

  const { id } = await params;
  const { msg } = await searchParams;
  const regiao = await prisma.regiao.findUnique({ where: { id } });
  if (!regiao) notFound();

  const salvar = atualizarRegiao.bind(null, id);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Editar bairro</h1>
        <p className="mt-1 text-sm text-muted">{regiao.cidade}</p>
      </div>

      {msg && (
        <div className="rounded-xl border border-sky-400/30 bg-sky-400/10 p-4 text-sm text-sky-200">
          {msg}
        </div>
      )}

      <form action={salvar} className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
        <div>
          <label className="text-xs uppercase tracking-wide text-muted">Nome do bairro</label>
          <input
            type="text"
            name="nome"
            required
            defaultValue={regiao.nome}
            className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-foreground"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-muted">Estado</label>
          <input
            type="text"
            name="estado"
            required
            defaultValue={regiao.estado}
            maxLength={2}
            className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm uppercase text-foreground"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="ativo"
            defaultChecked={regiao.ativo}
            className="h-4 w-4 accent-sky-400"
          />
          Ativo
        </label>
        <Button type="submit" variant="gold" className="w-full">
          Salvar
        </Button>
      </form>
    </div>
  );
}
