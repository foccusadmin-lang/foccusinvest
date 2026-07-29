import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth, signIn, REF_COOKIE } from "@/auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/google-icon";

export default async function RegistrarPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/painel");
  const { ref } = await searchParams;

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center">
        <div className="flex justify-center">
          <Logo size={44} showTagline />
        </div>

        <h1 className="mt-8 text-xl font-semibold text-foreground">Criar conta</h1>
        <p className="mt-2 text-sm text-muted">Cadastre-se com sua Conta Google.</p>

        <form
          className="mt-8"
          action={async () => {
            "use server";
            if (ref) {
              const cookieStore = await cookies();
              cookieStore.set(REF_COOKIE, ref, {
                maxAge: 600,
                httpOnly: true,
                sameSite: "lax",
              });
            }
            await signIn("google", { redirectTo: "/pos-login" });
          }}
        >
          <Button type="submit" variant="gold" className="w-full">
            <GoogleIcon /> Criar conta com Google
          </Button>
        </form>

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
