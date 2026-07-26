import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Logo } from "@/components/logo";
import { LinkButton } from "@/components/ui/button";
import { IconShield } from "@/components/icons";

export default async function RestritoPage() {
  const session = await auth();
  const isAdmin = session?.user?.perfil === "ADMIN";

  if (isAdmin) redirect("/restrito/painel");

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-red-900/40 bg-surface p-8 text-center">
        <div className="flex justify-center">
          <Logo size={40} />
        </div>

        <div className="mx-auto mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
          <IconShield width={22} height={22} />
        </div>

        <h1 className="mt-4 text-lg font-semibold text-foreground">
          Área exclusiva para administradores autorizados
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Tentativas de acesso não autorizado poderão ser registradas e
          submetidas às medidas de segurança previstas nos Termos de Uso.
        </p>

        <div className="mt-8">
          <LinkButton
            href={`/login?callbackUrl=${encodeURIComponent("/restrito")}`}
            variant="outline"
            className="w-full"
          >
            Entrar como administrador
          </LinkButton>
        </div>

        <Link
          href="/"
          className="mt-6 inline-block text-xs text-muted hover:text-gold-light"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
