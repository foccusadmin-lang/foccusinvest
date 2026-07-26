import Link from "next/link";
import { Logo } from "@/components/logo";
import { RecuperarForm } from "./recuperar-form";

export default function RecuperarSenhaPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8">
        <div className="flex justify-center">
          <Logo size={44} showTagline />
        </div>

        <h1 className="mt-8 text-center text-xl font-semibold text-foreground">
          Recuperar senha
        </h1>
        <p className="mt-2 text-center text-sm text-muted">
          Informe o e-mail usado no cadastro.
        </p>

        <div className="mt-8">
          <RecuperarForm />
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="text-gold-light hover:underline">
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  );
}
