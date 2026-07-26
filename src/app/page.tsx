import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { LinkButton } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.16),transparent_60%)]" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <LogoMark size={34} />
          <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-wide text-gold-gradient">
            FOCCUS <span className="text-foreground/90">INVEST</span>
          </span>
        </div>
        <Link
          href="/login"
          className="text-sm font-medium text-muted transition hover:text-gold-light"
        >
          Entrar
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <span className="rounded-full border border-border bg-surface px-4 py-1 text-xs uppercase tracking-[0.2em] text-gold-light">
          Investimento com propósito
        </span>

        <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-bold leading-tight text-foreground sm:text-5xl">
          Participação em resultados,{" "}
          <span className="text-gold-gradient">com transparência.</span>
        </h1>

        <p className="mt-6 max-w-xl text-base leading-relaxed text-muted">
          A Foccus Invest gerencia aportes e distribuição variável de
          resultados empresariais. A rentabilidade é variável, não é
          garantida e está sempre vinculada a resultados comprováveis.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <LinkButton href="/registrar" variant="gold">
            Começar agora
          </LinkButton>
          <LinkButton href="/termos" variant="outline">
            Conhecer riscos e termos
          </LinkButton>
        </div>
      </main>

      <footer className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center gap-2 border-t border-border/70 px-6 py-8 text-center text-xs text-muted sm:flex-row sm:justify-between sm:text-left">
        <p>© {new Date().getFullYear()} Foccus Invest. Todos os direitos reservados.</p>
        <div className="flex gap-4">
          <Link href="/termos" className="hover:text-gold-light">
            Termos de Uso
          </Link>
          <Link href="/privacidade" className="hover:text-gold-light">
            Política de Privacidade
          </Link>
          <Link href="/restrito" className="hover:text-gold-light">
            Restrito
          </Link>
        </div>
      </footer>
    </div>
  );
}
