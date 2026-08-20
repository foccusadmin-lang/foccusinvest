import { formatMoeda } from "@/lib/format";

export type ResumoInvestidor = {
  id: string;
  nome: string;
  email: string;
  documento: string;
  capital: number;
  carencia: number;
  disponivel: number;
  rendimentoDisponivel: number;
  bonus: number;
  total: number;
};

function Campo({
  label,
  value,
  tone = "text-foreground",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

/** Resumo em destaque de um investidor encontrado numa busca por nome/e-mail — mostra os dados
 *  de identificação e todos os saldos relevantes de uma vez, sem precisar abrir o cadastro
 *  completo. Reaproveitado em /restrito/historico e /restrito/usuarios. */
export function DestaqueInvestidor({ investidor }: { investidor: ResumoInvestidor }) {
  return (
    <div className="rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 via-surface to-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gold-light">Nome</p>
          <p className="text-lg font-bold text-foreground">{investidor.nome}</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
          <span>
            <span className="text-muted">E-mail: </span>
            <span className="text-foreground">{investidor.email}</span>
          </span>
          <span>
            <span className="text-muted">CPF: </span>
            <span className="text-foreground">{investidor.documento}</span>
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Campo label="Capital" value={formatMoeda(investidor.capital)} tone="text-emerald-300" />
        <Campo label="Carência" value={formatMoeda(investidor.carencia)} tone="text-amber-300" />
        <Campo label="Disponível" value={formatMoeda(investidor.disponivel)} tone="text-sky-300" />
        <Campo
          label="Rendimento disponível"
          value={formatMoeda(investidor.rendimentoDisponivel)}
          tone="text-gold-light"
        />
        <Campo label="Bônus" value={formatMoeda(investidor.bonus)} tone="text-fuchsia-300" />
        <Campo label="Total" value={formatMoeda(investidor.total)} tone="text-gold-light" />
      </div>
    </div>
  );
}
