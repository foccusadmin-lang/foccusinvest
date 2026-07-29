import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/google-icon";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/pos-login");

  const { callbackUrl } = await searchParams;
  const destino = callbackUrl || "/pos-login";

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center shadow-[0_0_60px_-20px_rgba(212,175,55,0.25)]">
        <div className="flex justify-center">
          <Logo size={48} showTagline />
        </div>

        <h1 className="mt-8 text-xl font-semibold text-foreground">
          Acesse sua conta
        </h1>
        <p className="mt-2 text-sm text-muted">Entre com sua Conta Google.</p>

        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: destino });
          }}
        >
          <Button type="submit" variant="gold" className="w-full">
            <GoogleIcon /> Entrar com Google
          </Button>
        </form>

        <p className="mt-4 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-xs leading-relaxed text-gold-light">
          Se sua conta foi criada com e-mail e senha, entre com a Conta Google que usa o mesmo
          e-mail cadastrado — o acesso é vinculado automaticamente.
        </p>

        <p className="mt-6 text-sm text-muted">
          Não tem uma conta?{" "}
          <Link href="/registrar" className="text-gold-light hover:underline">
            Criar conta
          </Link>
        </p>

        <p className="mt-4 text-xs leading-relaxed text-muted">
          Ao continuar, você concorda com os{" "}
          <a href="/termos" className="text-gold-light hover:underline">
            Termos de Uso
          </a>{" "}
          e a{" "}
          <a href="/privacidade" className="text-gold-light hover:underline">
            Política de Privacidade
          </a>
          .
        </p>
      </div>
    </div>
  );
}
