"use client";

import { useEffect } from "react";

export default function RestritoError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro na área administrativa:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center">
      <h2 className="text-lg font-semibold text-foreground">Algo deu errado nessa tela</h2>
      <p className="max-w-md text-sm text-muted">
        A ação pode não ter sido concluída. Tente novamente — se persistir, nenhum dado foi
        alterado sem sua confirmação, então é seguro recarregar a página.
      </p>
      {error.digest && <p className="text-xs text-muted">Código: {error.digest}</p>}
      <button
        onClick={reset}
        className="mt-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-light"
      >
        Tentar novamente
      </button>
    </div>
  );
}
