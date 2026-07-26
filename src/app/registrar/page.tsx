import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Logo } from "@/components/logo";
import { RegistrarForm } from "./registrar-form";

export default async function RegistrarPage() {
  const session = await auth();
  if (session?.user) redirect("/painel");

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8">
        <div className="flex justify-center">
          <Logo size={44} showTagline />
        </div>

        <h1 className="mt-8 text-center text-xl font-semibold text-foreground">
          Criar conta
        </h1>
        <p className="mt-2 text-center text-sm text-muted">
          Cadastre-se com e-mail e senha.
        </p>

        <div className="mt-8">
          <RegistrarForm />
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Já tem uma conta?{" "}
          <Link href="/login" className="text-gold-light hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
