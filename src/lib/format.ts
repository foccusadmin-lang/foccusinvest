export function formatMoeda(value: number, moeda: "BRL" | "USD" | "USDT" = "BRL"): string {
  if (moeda === "USDT") {
    return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: moeda,
  }).format(value);
}

export function formatData(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
