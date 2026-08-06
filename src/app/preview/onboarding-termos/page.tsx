import { Logo } from "@/components/logo";
import { TermosChecklist } from "@/app/onboarding/termos/termos-checklist";

async function noop() {
  "use server";
}

export default function PreviewOnboardingTermosPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8">
        <div className="flex justify-center">
          <Logo size={40} />
        </div>
        <h1 className="mt-6 text-center text-xl font-semibold text-foreground">Antes de continuar</h1>
        <p className="mt-2 text-center text-sm text-muted">
          Marque os itens abaixo para prosseguir com o seu cadastro.
        </p>
        <TermosChecklist action={noop} />
      </div>
    </div>
  );
}
