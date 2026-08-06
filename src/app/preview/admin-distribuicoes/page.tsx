import { DistribuicaoForm } from "@/app/restrito/distribuicoes/distribuicao-form";
import { formatMoeda, formatData } from "@/lib/format";
import { AdminPreviewShell } from "../_admin-shell";

const agora = Date.now();
const dia = 24 * 60 * 60 * 1000;

export default function PreviewAdminDistribuicoesPage() {
  const periodoInicio = new Date(agora - 20 * dia);
  const periodoFim = new Date(agora + 10 * dia);
  const diasTotais = 30;
  const diasDecorridos = 20;
  const progresso = Math.round((diasDecorridos / diasTotais) * 100);

  return (
    <AdminPreviewShell>
      <h1 className="text-2xl font-bold text-foreground">Distribuições</h1>
      <p className="mt-1 text-sm text-muted">
        Lance um resultado real do período — o pagamento é diluído e liberado automaticamente dia a
        dia para cada investidor, proporcional ao capital de cada um.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <DistribuicaoForm />
      </div>

      <p className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
        Histórico
      </p>

      <div className="space-y-3">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-foreground">
                {formatData(periodoInicio)} — {formatData(periodoFim)}
              </p>
              <p className="text-xs text-muted">
                Lançado em {formatData(new Date(agora - 20 * dia))} · 116 investidor(es) elegível(is) ·
                por Admin
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-gold-light">3.2%</p>
              <p className="text-xs text-muted">{formatMoeda(58800)} no total</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-foreground/90">Resultado apurado em julho de 2026</p>
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#f2d675] to-[#93731f]"
                style={{ width: `${progresso}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted">
              {diasDecorridos} de {diasTotais} dias pagos ({progresso}%)
            </p>
          </div>
        </div>
      </div>
    </AdminPreviewShell>
  );
}
