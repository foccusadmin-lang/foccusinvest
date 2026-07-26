"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ViewSwitcher() {
  const pathname = usePathname();
  const emAdmin = pathname?.startsWith("/restrito");

  return (
    <div className="flex shrink-0 rounded-lg border border-border bg-surface-2 p-0.5">
      <Link
        href="/restrito/painel"
        className={`whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-semibold transition sm:px-3 ${
          emAdmin ? "bg-gold text-black" : "text-muted hover:text-foreground"
        }`}
      >
        Admin
      </Link>
      <Link
        href="/painel"
        className={`whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-semibold transition sm:px-3 ${
          !emAdmin ? "bg-gold text-black" : "text-muted hover:text-foreground"
        }`}
      >
        Investidor
      </Link>
    </div>
  );
}
