"use client";

import { useTransition } from "react";
import { alternarSaqueEmergencial } from "./ajuste-actions";

export function SaqueEmergencialToggle({
  userId,
  liberado,
}: {
  userId: string;
  liberado: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  if (liberado) {
    return (
      <button
        disabled={isPending}
        onClick={() => startTransition(() => alternarSaqueEmergencial(userId, false))}
        title="Saque de emergência liberado — clique para bloquear"
        className="rounded-lg bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/25 disabled:opacity-50"
      >
        Emergência: liberado
      </button>
    );
  }

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => alternarSaqueEmergencial(userId, true))}
      title="Liberar saque de emergência pra esse investidor"
      className="rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold text-muted hover:bg-white/15 disabled:opacity-50"
    >
      Liberar emergência
    </button>
  );
}
