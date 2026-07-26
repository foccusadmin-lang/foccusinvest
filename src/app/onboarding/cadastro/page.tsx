import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/logo";
import { CadastroForm } from "./cadastro-form";

export default async function OnboardingCadastroPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const aceite = await prisma.termoAceite.findFirst({
    where: { userId: session.user.id, tipo: "termos_uso" },
  });
  if (!aceite) redirect("/onboarding/termos");

  if (session.user.statusCadastro !== "INCOMPLETO") {
    redirect("/painel");
  }

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
