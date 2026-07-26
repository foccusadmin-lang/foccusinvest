import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn, googleConfigurado } from "@/auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { CredentialsForm } from "./credentials-form";

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
        <p className="mt-2 text-sm text-muted">
          {googleConfigurado
            ? "Entre com sua Conta Google ou e-mail e senha."
            : "Entre com e-mail e senha."}
        </p>

        {googleConfigurado && (
          <>
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

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wider text-muted">ou</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <div className={googleConfigurado ? "" : "mt-8"}>
          <CredentialsForm callbackUrl={destino} />
        </div>

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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.1-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.5 16 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3c-7.4 0-13.7 4.2-16.9 10.3z"
      />
      <path
        fill="#4CAF50"
        d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.1 36.4 26.6 37 24 37c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.4 40.7 16.1 45 24 45z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C40.5 36.2 44 30.7 44 24c0-1.2-.1-2.1-.4-3.5z"
      />
    </svg>
  );
}
