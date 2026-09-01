"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Logo } from "@/components/logo";
import { IconLogout, IconHeadset } from "@/components/icons";
import { ViewSwitcher } from "./view-switcher";
import { TELEFONE_ATENDIMENTO_ADMIN } from "@/lib/config";

const LINKS = [
  { href: "/restrito/painel", label: "Painel" },
  { href: "/restrito/usuarios", label: "Usuários" },
  { href: "/restrito/aportes", label: "Aportes" },
  { href: "/restrito/saques", label: "Saques" },
  { href: "/restrito/distribuicoes", label: "Distribuições" },
  { href: "/restrito/plr-individual", label: "PLR Individual" },
  { href: "/restrito/plr-automatico", label: "PLR Automático" },
  { href: "/restrito/reaplicacoes", label: "Reaplicações" },
  { href: "/restrito/transferencia", label: "Transferência de Saldo" },
  { href: "/restrito/migracao", label: "Migração" },
  { href: "/restrito/historico", label: "Histórico" },
  { href: "/restrito/entidades", label: "Entidades" },
  { href: "/restrito/doacoes", label: "Doações" },
  { href: "/restrito/lideranca", label: "Liderança" },
  { href: "/restrito/guia", label: "Guia Foccus" },
  { href: "/restrito/estrategia", label: "Vitrine de Operação" },
  { href: "/restrito/indices", label: "Rentabilidade vs Índices" },
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
          <a
            href={`https://wa.me/${TELEFONE_ATENDIMENTO_ADMIN}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Suporte ADM"
            title="Suporte ADM"
            className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted transition hover:text-gold-light"
          >
            <IconHeadset width={16} height={16} />
          </a>
          <button
            aria-label="Sair"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted transition hover:text-red-300"
          >
            <IconLogout width={16} height={16} />
          </button>
        </nav>
      </div>
    </header>
  );
}
