import { Logo } from "@/components/logo";
import { CadastroForm } from "@/app/onboarding/cadastro/cadastro-form";

export default function PreviewOnboardingCadastroPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8">
        <div className="flex justify-center">
          <Logo size={40} />
        </div>
        <h1 className="mt-6 text-center text-xl font-semibold text-foreground">
          Complete seu cadastro
        </h1>
        <p className="mt-2 text-center text-sm text-muted">
          Precisamos de alguns dados para liberar sua conta.
        </p>
        <div className="mt-8">
          <CadastroForm />
        </div>
      </div>
    </div>
  );
}
