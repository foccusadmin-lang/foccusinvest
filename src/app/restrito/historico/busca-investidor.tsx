export function BuscaInvestidor({ valorInicial }: { valorInicial: string }) {
  return (
    <form className="flex gap-2">
      <input
        name="q"
        type="text"
        defaultValue={valorInicial}
        placeholder="Buscar por nome ou e-mail do investidor..."
        className="w-full max-w-md rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
      />
      <button
        type="submit"
        className="shrink-0 rounded-lg bg-gold/15 px-4 py-2 text-sm font-semibold text-gold-light hover:bg-gold/25"
      >
        Buscar
      </button>
    </form>
  );
}
