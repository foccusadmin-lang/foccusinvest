import Link from "next/link";
import { Logo } from "@/components/logo";
import { formatMoeda, formatData } from "@/lib/format";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  CONFIRMADA: { label: "Confirmado", className: "bg-emerald-500/15 text-emerald-300" },
  RETIRADA: { label: "Encerrado", className: "bg-white/10 text-muted" },
};

const contratos = [
  { id: "c1", valor: 5000, criadoEm: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), status: "CONFIRMADA" },
  { id: "c2", valor: 640, criadoEm: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), status: "CONFIRMADA" },
];

export default function PreviewPainelContratosPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/80 bg-ink/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo size={30} />
          <Link href="/painel" className="text-sm text-muted hover:text-gold-light">
            Voltar ao painel
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-foreground">Meus contratos</h1>
        <p className="mt-1 text-sm text-muted">
          Contratos de prestação de serviços gerados a cada aplicação, com os dados confirmados no
          momento da contratação.
        </p>

        <div className="mt-6 space-y-3">
          {contratos.map((c) => {
            const status = STATUS_LABEL[c.status];
            return (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4"
              >
                <div>
                  <p className="font-semibold text-foreground">{formatMoeda(c.valor)}</p>
                  <p className="text-xs text-muted">Assinado em {formatData(c.criadoEm)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
                  {status.label}
                </span>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
