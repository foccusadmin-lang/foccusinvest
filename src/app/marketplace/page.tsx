import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/button";
import { MARKETPLACE_REGIAO_LABEL } from "@/lib/marketplace/config";
import { aplicarPapelMarketplace, rotaDashboardMarketplace } from "@/lib/marketplace/onboarding";
import type { PapelMarketplace } from "@prisma/client";

const PAPEIS_VALIDOS: PapelMarketplace[] = ["CLIENTE", "PRESTADOR"];

export default async function MarketplaceHomePage({
  searchParams,
}: {
  searchParams: Promise<{ papel?: string }>;
}) {
  const session = await auth();
  const { papel: papelQuery } = await searchParams;

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { papelMarketplace: true },
    });

    if (user?.papelMarketplace) {
      redirect(rotaDashboardMarketplace(user.papelMarketplace));
    }

    // Veio do fluxo "SOU CLIENTE"/"SOU PRESTADOR" da landing, escolhido antes do login e
    // recuperado agora via callbackUrl — aplica o papel automaticamente, sem pedir de novo.
    const papelPendente = PAPEIS_VALIDOS.find((p) => p === papelQuery);
    if (papelPendente) {
      await aplicarPapelMarketplace(session.user.id, papelPendente);
      redirect(rotaDashboardMarketplace(papelPendente));
    }

    return <EscolherPapelLogado />;
  }

  return <LandingDeslogada />;
}

function LandingDeslogada() {
  return (
    <div className="flex flex-col items-center px-4 py-8 text-center">
      <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-sky-300">
        📍 Disponível em {MARKETPLACE_REGIAO_LABEL}
      </span>

      <h1 className="mt-6 max-w-xl text-3xl font-bold text-foreground sm:text-4xl">
        Encontre profissionais de confiança perto de você
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted">
        Babá, eletricista, diarista, encanador e muito mais — profissionais que atendem sua
        região em {MARKETPLACE_REGIAO_LABEL}.
      </p>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-muted">
        Como você deseja usar o aplicativo?
      </h2>

      <div className="mt-4 grid w-full max-w-md grid-cols-1 gap-4 sm:grid-cols-2">
        <LinkButton
          href={`/login?callbackUrl=${encodeURIComponent("/marketplace?papel=CLIENTE")}`}
          variant="outline"
          className="h-24 flex-col border-sky-400/30 text-base hover:border-sky-400/70"
        >
          🙋 Sou cliente
          <span className="text-xs font-normal text-muted">Quero contratar um serviço</span>
        </LinkButton>
        <LinkButton
          href={`/login?callbackUrl=${encodeURIComponent("/marketplace?papel=PRESTADOR")}`}
          variant="outline"
          className="h-24 flex-col border-sky-400/30 text-base hover:border-sky-400/70"
        >
          🛠️ Sou prestador
          <span className="text-xs font-normal text-muted">Quero oferecer meus serviços</span>
        </LinkButton>
      </div>

      <p className="mt-8 text-sm text-muted">
        Já tem uma conta?{" "}
        <Link href="/login?callbackUrl=/marketplace" className="text-sky-300 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}

function EscolherPapelLogado() {
  return (
    <div className="flex flex-col items-center px-4 py-8 text-center">
      <h1 className="text-2xl font-bold text-foreground">Como você deseja usar o aplicativo?</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        Você pode mudar isso depois falando com o suporte — por enquanto, escolha como vai usar
        o Foccus Serviços.
      </p>

      <div className="mt-8 grid w-full max-w-md grid-cols-1 gap-4 sm:grid-cols-2">
        <form
          action={async () => {
            "use server";
            const session = await auth();
            if (!session?.user?.id) redirect("/login?callbackUrl=/marketplace");
            await aplicarPapelMarketplace(session.user.id, "CLIENTE");
            redirect("/marketplace/cliente/dashboard");
          }}
        >
          <button
            type="submit"
            className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border border-sky-400/30 bg-surface/50 px-5 text-base font-semibold text-foreground transition hover:border-sky-400/70"
          >
            🙋 Sou cliente
            <span className="text-xs font-normal text-muted">Quero contratar um serviço</span>
          </button>
        </form>

        <form
          action={async () => {
            "use server";
            const session = await auth();
            if (!session?.user?.id) redirect("/login?callbackUrl=/marketplace");
            await aplicarPapelMarketplace(session.user.id, "PRESTADOR");
            redirect("/marketplace/prestador/dashboard");
          }}
        >
          <button
            type="submit"
            className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border border-sky-400/30 bg-surface/50 px-5 text-base font-semibold text-foreground transition hover:border-sky-400/70"
          >
            🛠️ Sou prestador
            <span className="text-xs font-normal text-muted">Quero oferecer meus serviços</span>
          </button>
        </form>
      </div>
    </div>
  );
}
