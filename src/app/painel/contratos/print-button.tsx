"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-gold/20 px-3 py-1.5 text-xs font-semibold text-gold-light hover:bg-gold/30"
    >
      Imprimir
    </button>
  );
}
