import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/logo";
import { OnboardingVoltar } from "@/components/onboarding-voltar";
import { aceitarTermos } from "./actions";
import { TermosChecklist } from "./termos-checklist";

export default async function OnboardingTermosPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const jaAceitou = await prisma.termoAceite.findFirst({
    where: { userId: session.user.id, tipo: "termos_uso" },
  });
  if (jaAceitou) redirect("/onboarding/cadastro");

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8">
        <OnboardingVoltar />
        <div className="flex justify-center">
          <Logo size={40} />
        </div>

        <h1 className="mt-6 text-center text-xl font-semibold text-foreground">
          Antes de continuar
        </h1>
        <p className="mt-2 text-center text-sm text-muted">
          Marque os itens abaixo para prosseguir com o seu cadastro.
        </p>

        <TermosChecklist action={aceitarTermos} />
      </div>
    </div>
  );
}
