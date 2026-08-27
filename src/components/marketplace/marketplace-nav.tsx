"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { IconLogout } from "@/components/icons";
import { MARKETPLACE_REGIAO_LABEL } from "@/lib/marketplace/config";

export function MarketplaceNav({
  logado,
  papel,
}: {
  logado: boolean;
  papel: "CLIENTE" | "PRESTADOR" | null;
}) {
  const dashboardHref =
    papel === "PRESTADOR"
      ? "/marketplace/prestador/dashboard"
      : papel === "CLIENTE"
        ? "/marketplace/cliente/dashboard"
        : "/marketplace";

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href={dashboardHref} className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-display)] text-lg font-bold text-foreground">
            Foccus <span className="text-sky-400">Serviços</span>
          </span>
        </Link>

        <div className="flex items-center gap-3 text-sm text-muted">
          <span className="hidden items-center gap-1 whitespace-nowrap sm:flex">
            📍 {MARKETPLACE_REGIAO_LABEL}
          </span>
          {logado ? (
            <button
              aria-label="Sair"
              onClick={() => signOut({ callbackUrl: "/marketplace" })}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted transition hover:text-red-300"
            >
              <IconLogout width={16} height={16} />
            </button>
          ) : (
            <Link
              href="/login?callbackUrl=/marketplace"
              className="whitespace-nowrap rounded-lg border border-border px-3 py-2 font-medium text-foreground transition hover:border-sky-400/60 hover:text-sky-300"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
