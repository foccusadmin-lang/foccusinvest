import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/google-icon";

export default function PreviewRegistrarPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center">
        <div className="flex justify-center">
          <Logo size={44} showTagline />
        </div>
        <h1 className="mt-8 text-xl font-semibold text-foreground">Criar conta</h1>
        <p className="mt-2 text-sm text-muted">Cadastre-se com sua Conta Google.</p>
        <div className="mt-8">
          <Button type="button" variant="gold" className="w-full">
            <GoogleIcon /> Criar conta com Google
          </Button>
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          Já tem uma conta?{" "}
          <Link href="/preview/login" className="text-gold-light hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
