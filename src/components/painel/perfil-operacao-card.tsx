import { LOCAL_OPERACAO, PERFIS_OPERACAO, classificarPerfil, type CodigoPerfil } from "@/lib/perfil-operacao";

// Classes escritas por extenso (não montadas por string) pro Tailwind enxergar cada uma.
const ESTILO: Record<CodigoPerfil, { ponto: string; badge: string; linha: string; texto: string }> = {
  CONSERVADOR: {
    ponto: "bg-sky-500",
    badge: "border-sky-500/40 bg-sky-500/15 text-sky-200",
    linha: "bg-sky-500/10",
    texto: "text-sky-300",
  },
  MODERADO: {
    ponto: "bg-emerald-500",
    badge: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
    linha: "bg-emerald-500/10",
    texto: "text-emerald-300",
  },
  AGRESSIVO: {
    ponto: "bg-orange-500",
    badge: "border-orange-500/40 bg-orange-500/15 text-orange-200",
    linha: "bg-orange-500/10",
    texto: "text-orange-300",
  },
  SUPERAGRESSIVO: {
    ponto: "bg-red-500",
    badge: "border-red-500/40 bg-red-500/15 text-red-200",
    linha: "bg-red-500/10",
    texto: "text-red-300",
  },
};

function formatPctBR(v: number): string {
  return `${v.toFixed(2).replace(".", ",")}%`;
}

function formatDataBR(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Demonstrativo do perfil em que a Foccus está operando: o percentual diário lançado pelo admin
 *  (ponto mais recente da Vitrine de Operação) é classificado em Conservador/Moderado/Agressivo/
 *  Superagressivo, com a cor correspondente. Sem lançamento ainda, mostra só a tabela de perfis. */
export function PerfilOperacaoCard({
  retornoDiario,
  dataReferencia,
}: {
  retornoDiario: number | null;
  dataReferencia: string | null;
}) {
  const atual = retornoDiario === null ? null : classificarPerfil(retornoDiario);

  return (
    <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
      <p className="text-sm font-semibold text-foreground">Perfil de operação</p>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted">— onde operamos —</p>

      <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
        <div className="rounded-lg bg-surface-2 px-3 py-2">
          <dt className="text-[10px] uppercase tracking-wider text-muted">Mercado</dt>
          <dd className="mt-0.5 font-semibold text-foreground">{LOCAL_OPERACAO.mercado}</dd>
        </div>
        <div className="rounded-lg bg-surface-2 px-3 py-2">
          <dt className="text-[10px] uppercase tracking-wider text-muted">Corretora</dt>
          <dd className="mt-0.5 font-semibold text-foreground">{LOCAL_OPERACAO.corretora}</dd>
        </div>
        <div className="rounded-lg bg-surface-2 px-3 py-2">
          <dt className="text-[10px] uppercase tracking-wider text-muted">Conta de operação</dt>
          <dd className="mt-0.5 font-semibold text-foreground">{LOCAL_OPERACAO.conta}</dd>
        </div>
      </dl>

      {atual && retornoDiario !== null ? (
        <div className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${ESTILO[atual.codigo].badge}`}>
          <div>
            <p className="text-[10px] uppercase tracking-wider opacity-80">Operando agora no perfil</p>
            <p className="mt-0.5 text-base font-bold">
              <span aria-hidden>{atual.icone}</span> {atual.nome}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{formatPctBR(retornoDiario)} ao dia</p>
            <p className="text-[11px] opacity-80">
              Risco {atual.risco}
              {dataReferencia ? ` · lançamento de ${formatDataBR(dataReferencia)}` : ""}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-border bg-surface-2 px-4 py-3 text-xs text-muted">
          O perfil de operação aparece aqui assim que o primeiro percentual diário for lançado.
        </p>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-muted">
            <tr>
              <th className="px-2 py-2 font-semibold">Perfil</th>
              <th className="px-2 py-2 font-semibold">Retorno diário</th>
              <th className="px-2 py-2 font-semibold">Risco</th>
              <th className="px-2 py-2 font-semibold">Cor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {PERFIS_OPERACAO.map((p) => {
              const ativo = atual?.codigo === p.codigo;
              return (
                <tr key={p.codigo} className={ativo ? ESTILO[p.codigo].linha : undefined}>
                  <td className={`px-2 py-2 ${ativo ? `font-bold ${ESTILO[p.codigo].texto}` : "text-foreground"}`}>
                    <span aria-hidden>{p.icone}</span> {p.nome}
                    {ativo && <span className="ml-2 text-[10px] uppercase tracking-wider">atual</span>}
                  </td>
                  <td className="px-2 py-2 text-muted">{p.faixa}</td>
                  <td className="px-2 py-2 text-muted">{p.risco}</td>
                  <td className="px-2 py-2 text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${ESTILO[p.codigo].ponto}`} /> {p.corNome}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
