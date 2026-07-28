"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Logo } from "@/components/logo";
import { IconLogout } from "@/components/icons";
import { ViewSwitcher } from "./view-switcher";

const LINKS = [
  { href: "/restrito/painel", label: "Painel" },
  { href: "/restrito/usuarios", label: "Usuários" },
  { href: "/restrito/aportes", label: "Aportes" },
  { href: "/restrito/saques", label: "Saques" },
  { href: "/restrito/distribuicoes", label: "Distribuições" },
  { href: "/restrito/plr-individual", label: "PLR Individual" },
  { href: "/restrito/migracao", label: "Migração" },
  { href: "/restrito/historico", label: "Histórico" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-red-900/30 bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3 sm:gap-6">
          <Logo size={28} />
          <ViewSwitcher />
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto">
          {LINKS.map((link) => {
            const ativo = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                  ativo
                    ? "bg-gold/15 text-gold-light"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <button
            aria-label="Sair"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted transition hover:text-red-300"
          >
            <IconLogout width={16} height={16} />
          </button>
        </nav>
      </div>
    </header>
  );
}
