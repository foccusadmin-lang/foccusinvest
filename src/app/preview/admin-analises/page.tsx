import { formatMoeda } from "@/lib/format";
import { AdminPreviewShell } from "../_admin-shell";

function BarraSimples({
  dados,
  corBarra,
  formatarValor,
}: {
  dados: { label: string; valor: number }[];
  corBarra: string;
  formatarValor: (v: number) => string;
}) {
  const max = Math.max(...dados.map((d) => d.valor), 1);
  return (
    <div className="flex items-end justify-between gap-2" style={{ height: 160 }}>
      {dados.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10px] text-muted">{d.valor > 0 ? formatarValor(d.valor) : ""}</span>
          <div
            className={`w-full rounded-t-md ${corBarra}`}
            style={{ height: Math.max((d.valor / max) * 120, d.valor > 0 ? 4 : 0) }}
          />
          <span className="text-[10px] uppercase text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

const meses = ["mar.", "abr.", "mai.", "jun.", "jul.", "ago."];
const dadosUsuarios = meses.map((label, i) => ({ label, valor: [12, 18, 9, 24, 31, 22][i] }));
const dadosCapital = meses.map((label, i) => ({ label, valor: [45000, 62000, 38000, 91000, 120000, 98000][i] }));

const saques = [
  { status: "SOLICITADO", label: "Solicitado", count: 4, total: 12800 },
  { status: "APROVADO", label: "Aprovado", count: 3, total: 9200 },
  { status: "PAGO", label: "Pago", count: 41, total: 186400 },
  { status: "RECUSADO", label: "Recusado", count: 2, total: 1500 },
  { status: "CANCELADO", label: "Cancelado", count: 1, total: 300 },
];

export default function PreviewAdminAnalisesPage() {
  return (
    <AdminPreviewShell>
      <h1 className="text-2xl font-bold text-foreground">Gráficos e Análises</h1>
      <p className="mt-1 text-sm text-muted">Visão geral dos últimos 6 meses da plataforma.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Novos investidores no período
          </p>
          <p className="mt-1 text-2xl font-bold text-sky-300">116</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Capital aportado no período
          </p>
          <p className="mt-1 text-2xl font-bold text-gold-light">{formatMoeda(454000)}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Novos investidores por mês</h2>
          <BarraSimples dados={dadosUsuarios} corBarra="bg-sky-500" formatarValor={(v) => String(v)} />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Capital aportado por mês</h2>
          <BarraSimples
            dados={dadosCapital}
            corBarra="bg-gradient-to-t from-[#93731f] to-[#f2d675]"
            formatarValor={(v) => formatMoeda(v)}
          />
        </div>
      </div>

      <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
        Saques por status (histórico completo)
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {saques.map((s) => (
          <div key={s.status} className="rounded-xl border border-border bg-surface p-4 text-center">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="mt-1 text-lg font-bold text-foreground">{s.count}</p>
            <p className="text-xs text-muted">{formatMoeda(s.total)}</p>
          </div>
        ))}
      </div>
    </AdminPreviewShell>
  );
}
