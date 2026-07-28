"use client";

import { signOut } from "next-auth/react";
import { IconArrowLeft } from "@/components/icons";

export function OnboardingVoltar() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="mb-2 flex items-center gap-1 text-sm text-muted transition hover:text-foreground"
    >
      <IconArrowLeft width={16} height={16} /> Voltar
    </button>
  );
}
