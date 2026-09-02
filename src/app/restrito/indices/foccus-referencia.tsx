type Ponto = { mes: string; foccus: number | null };

function formatMes(iso: string): string {
  const [ano, mes] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" })
    .format(new Date(Date.UTC(ano, mes - 1, 1)))
    .replace(".", "");
}

/** Referência só de leitura — mostra a rentabilidade que a Foccus Invest de fato distribuiu em
 *  cada mês (mesmo dado do comparativo do investidor), pro admin comparar enquanto lança os
 *  índices de mercado. Não é editável aqui: o valor da Foccus nunca é digitado à mão, sempre vem
 *  das Distribuições já lançadas (ver lib/indices-mercado.ts). */
export function FoccusReferencia({ pontos }: { pontos: Ponto[] }) {
  return (
    <div className="rounded-2xl border border-gold/30 bg-gold/5 p-5">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gold-light">
        Foccus Invest — referência (só leitura)
      </p>
      <p className="mb-3 text-xs text-muted">
        Rentabilidade que já foi de fato distribuída, mês a mês — mesmo dado do comparativo do
        investidor. Não editável aqui: vem sempre das Distribuições já lançadas, nunca digitado à
        mão.
      </p>
      <div className="flex flex-wrap gap-2">
        {pontos.map((p) => (
          <div key={p.mes} className="rounded-lg border border-border/70 bg-surface-2 px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted capitalize">{formatMes(p.mes)}</p>
            <p className={`text-sm font-semibold ${p.foccus === null ? "text-muted" : "text-gold-light"}`}>
              {p.foccus === null ? "—" : `${p.foccus.toFixed(2)}%`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
