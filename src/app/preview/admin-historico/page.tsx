import { formatMoeda, formatData } from "@/lib/format";
import { BuscaInvestidor } from "@/app/restrito/historico/busca-investidor";
import { AdminPreviewShell } from "../_admin-shell";

const agora = Date.now();
const dia = 24 * 60 * 60 * 1000;

const lancamentos = [
  { id: "l1", data: new Date(agora - dia), tipo: "Aplicação", usuario: "Waldir Rodrigues Custódio", valor: 5000, detalhe: "Status: CONFIRMADA", cor: "text-gold-light" },
  { id: "l2", data: new Date(agora - 2 * dia), tipo: "Saque · Rendimento", usuario: "Marina Souza Almeida", valor: -480.5, detalhe: "Status: PAGO", cor: "text-red-300" },
  { id: "l3", data: new Date(agora - 3 * dia), tipo: "Crédito de rendimento", usuario: "Carlos Eduardo Lima", valor: 120, detalhe: "PLR manual · julho/2026", cor: "text-emerald-300" },
  { id: "l4", data: new Date(agora - 5 * dia), tipo: "Distribuição lançada", usuario: "Admin", valor: 58800, detalhe: "3.2% · 01/07/2026 a 31/07/2026", cor: "text-sky-300" },
];

export default function PreviewAdminHistoricoPage() {
  return (
    <AdminPreviewShell>
      <h1 className="text-2xl font-bold text-foreground">Histórico completo</h1>
      <p className="mt-1 text-sm text-muted">Últimos {lancamentos.length} lançamentos de toda a plataforma.</p>

      <div className="mt-4">
        <BuscaInvestidor valorInicial="" />
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Investidor</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Detalhe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lancamentos.map((l) => (
              <tr key={l.id} className="bg-surface">
                <td className="whitespace-nowrap px-4 py-3 text-muted">{formatData(l.data)}</td>
                <td className="px-4 py-3 text-foreground">{l.tipo}</td>
                <td className="px-4 py-3 text-muted">{l.usuario}</td>
                <td className={`px-4 py-3 font-semibold ${l.cor}`}>
                  {l.valor < 0 ? "-" : ""}
                  {formatMoeda(Math.abs(l.valor))}
                </td>
                <td className="px-4 py-3 text-xs text-muted">{l.detalhe}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPreviewShell>
  );
}
