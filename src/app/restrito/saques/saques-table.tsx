"use client";

import { useMemo, useState } from "react";
import type { StatusSaque, TipoSaque } from "@prisma/client";
import { formatMoeda, formatData } from "@/lib/format";
import { SaqueActions } from "./saque-actions";
import { AmpliarQrCodeButton } from "./qrcode-modal";
import { LABEL_TIPO_CHAVE_PIX, type TipoChavePixForm } from "@/lib/pix-chave";
import { calcularTotaisSaque } from "@/lib/saques-totais";

const statusStyle: Record<string, string> = {
  SOLICITADO: "bg-sky-500/15 text-sky-300",
  AGUARDANDO_PAGAMENTO: "bg-amber-500/15 text-amber-300",
  PAGO: "bg-emerald-500/15 text-emerald-300",
  RECUSADO: "bg-red-500/15 text-red-300",
  CANCELADO: "bg-white/10 text-muted",
};

const statusLabel: Record<string, string> = {
  SOLICITADO: "Solicitado",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGO: "Pago",
  RECUSADO: "Recusado",
  CANCELADO: "Cancelado",
};

const tipoLabel: Record<string, string> = {
  CAPITAL: "Capital",
  RENDIMENTO: "Rendimento",
  BONUS: "Bônus",
};

export type SaqueLinha = {
  id: string;
  tipo: TipoSaque;
  valor: number;
  moeda: string;
  motivoEmergencia: string | null;
  emergencial: boolean;
  valorBruto: number | null;
  taxaAntecipacao: number | null;
  status: StatusSaque;
  justificativaRecusa: string | null;
  criadoEm: Date;
  investidorNome: string | null;
  investidorEmail: string | null;
  chavePixNormalizada: string | null;
  chavePixTipo: TipoChavePixForm | null;
  pixPayload: string | null;
  pixTxid: string | null;
  dataProgramadaPagamento: Date | null;
  pagoEm: Date | null;
  user: { name: string | null; email: string };
  processadoPor: { name: string | null; email: string } | null;
};

function chaveExibida(s: SaqueLinha): string {
  if (s.chavePixNormalizada) return s.chavePixNormalizada;
  // Compatibilidade com saques criados antes desse recurso, que guardavam a chave em
  // motivoEmergencia (nunca usado pra saque normal, só emergencial).
  if (!s.emergencial && s.motivoEmergencia) return s.motivoEmergencia;
  return "—";
}

function sextaDeStr(data: Date | null): string {
  if (!data) return "";
  return data.toISOString().slice(0, 10);
}

export function SaquesTable({
  pendentes,
  historico,
}: {
  pendentes: SaqueLinha[];
  historico: SaqueLinha[];
}) {
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"" | TipoSaque>("");
  const [filtroStatus, setFiltroStatus] = useState<"" | StatusSaque>("");
  const [filtroData, setFiltroData] = useState("");
  const [filtroSexta, setFiltroSexta] = useState("");

  const todos = useMemo(() => [...pendentes, ...historico], [pendentes, historico]);

  const sextasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    for (const s of todos) {
      const str = sextaDeStr(s.dataProgramadaPagamento);
      if (str) set.add(str);
    }
    return Array.from(set).sort();
  }, [todos]);

  function combinaFiltros(s: SaqueLinha): boolean {
    const termo = busca.trim().toLowerCase();
    if (termo) {
      const nome = (s.investidorNome ?? s.user.name ?? "").toLowerCase();
      const email = (s.investidorEmail ?? s.user.email).toLowerCase();
      if (!nome.includes(termo) && !email.includes(termo)) return false;
    }
    if (filtroTipo && s.tipo !== filtroTipo) return false;
    if (filtroStatus && s.status !== filtroStatus) return false;
    if (filtroData && s.criadoEm.toISOString().slice(0, 10) !== filtroData) return false;
    if (filtroSexta && sextaDeStr(s.dataProgramadaPagamento) !== filtroSexta) return false;
    return true;
  }

  const pendentesFiltrados = useMemo(() => pendentes.filter(combinaFiltros), [
    pendentes,
    busca,
    filtroTipo,
    filtroStatus,
    filtroData,
    filtroSexta,
  ]);
  const historicoFiltrados = useMemo(() => historico.filter(combinaFiltros), [
    historico,
    busca,
    filtroTipo,
    filtroStatus,
    filtroData,
    filtroSexta,
  ]);

  const totais = useMemo(() => calcularTotaisSaque(pendentesFiltrados), [pendentesFiltrados]);

  return (
    <>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryMini label="Rendimento solicitado" valor={formatMoeda(totais.rendimento)} />
        <SummaryMini label="Capital solicitado" valor={formatMoeda(totais.capital)} />
        <SummaryMini label="Total geral" valor={formatMoeda(totais.geral)} destaque />
        <SummaryMini label="Quantidade" valor={String(totais.quantidade)} />
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-xs">
          <span className="mb-1 block text-muted">Investidor</span>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            type="text"
            placeholder="Nome ou e-mail..."
            className="w-48 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-muted">Tipo</span>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as "" | TipoSaque)}
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
          >
            <option value="">Todos</option>
            <option value="CAPITAL">Capital</option>
            <option value="RENDIMENTO">Rendimento</option>
            <option value="BONUS">Bônus</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-muted">Status</span>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as "" | StatusSaque)}
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
          >
            <option value="">Todos</option>
            {Object.entries(statusLabel).map(([valor, label]) => (
              <option key={valor} value={valor}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-muted">Data da solicitação</span>
          <input
            type="date"
            value={filtroData}
            onChange={(e) => setFiltroData(e.target.value)}
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-muted">Sexta de pagamento</span>
          <select
            value={filtroSexta}
            onChange={(e) => setFiltroSexta(e.target.value)}
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
          >
            <option value="">Todas</option>
            {sextasDisponiveis.map((s) => (
              <option key={s} value={s}>
                {formatData(new Date(`${s}T12:00:00-03:00`))}
              </option>
            ))}
          </select>
        </label>
        {(busca || filtroTipo || filtroStatus || filtroData || filtroSexta) && (
          <button
            onClick={() => {
              setBusca("");
              setFiltroTipo("");
              setFiltroStatus("");
              setFiltroData("");
              setFiltroSexta("");
            }}
            className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-muted hover:bg-white/15"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {filtroSexta && (
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`/restrito/saques/pdf?sexta=${filtroSexta}`}
            className="rounded-lg bg-gold/15 px-3 py-2 text-xs font-semibold text-gold-light hover:bg-gold/25"
          >
            Gerar PDF da sexta ({formatData(new Date(`${filtroSexta}T12:00:00-03:00`))})
          </a>
          <a
            href={`/restrito/saques/zip?sexta=${filtroSexta}`}
            className="rounded-lg bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/25"
          >
            Baixar ZIP com os QR Codes
          </a>
        </div>
      )}

      <div className="mt-4">
        <Tabela titulo="Pendentes" saques={pendentesFiltrados} vazio="Nenhuma solicitação pendente." />
      </div>
      <div className="mt-8">
        <Tabela titulo="Histórico" saques={historicoFiltrados} vazio="Nenhum saque encontrado." />
      </div>
    </>
  );
}

function SummaryMini({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-1 text-lg font-bold ${destaque ? "text-gold-light" : "text-foreground"}`}>{valor}</p>
    </div>
  );
}

function Tabela({
  titulo,
  saques,
  vazio,
}: {
  titulo: string;
  saques: SaqueLinha[];
  vazio: string;
}) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted">{titulo}</p>
      {saques.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
          {vazio}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">QR</th>
                <th className="px-4 py-3">Investidor</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Chave Pix</th>
                <th className="px-4 py-3">Solicitado em</th>
                <th className="px-4 py-3">Pagamento programado</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {saques.map((s) => (
                <tr key={s.id} className="bg-surface align-top">
                  <td className="px-4 py-3">
                    {s.pixTxid ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/restrito/saques/${s.id}/qrcode`}
                        alt="QR Code Pix"
                        width={48}
                        height={48}
                        className="rounded bg-white p-0.5"
                      />
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{s.investidorNome ?? s.user.name ?? "—"}</p>
                    <p className="text-xs text-muted">{s.investidorEmail ?? s.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {tipoLabel[s.tipo]}
                    {s.emergencial && (
                      <span className="ml-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-300">
                        Emergência
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">
                    {formatMoeda(s.valor, s.moeda as "BRL")}
                    {s.emergencial && s.valorBruto != null && s.taxaAntecipacao != null && (
                      <p className="mt-0.5 text-[11px] font-normal text-amber-300">
                        Bruto {formatMoeda(s.valorBruto)} · Taxa Antecipação -{formatMoeda(s.taxaAntecipacao)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    <p>{s.chavePixTipo ? LABEL_TIPO_CHAVE_PIX[s.chavePixTipo] : "—"}</p>
                    <p className="max-w-[160px] break-all font-mono">{chaveExibida(s)}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">{formatData(s.criadoEm)}</td>
                  <td className="px-4 py-3 text-muted">
                    {s.dataProgramadaPagamento ? formatData(s.dataProgramadaPagamento) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyle[s.status]}`}
                    >
                      {statusLabel[s.status] ?? s.status}
                    </span>
                    {s.justificativaRecusa && (
                      <p className="mt-1 max-w-[220px] text-xs text-muted">{s.justificativaRecusa}</p>
                    )}
                    {s.emergencial && s.motivoEmergencia && (
                      <p className="mt-1 max-w-[220px] text-xs text-red-200/80">
                        Motivo: {s.motivoEmergencia}
                      </p>
                    )}
                    {s.processadoPor && (
                      <p className="mt-1 text-[11px] text-muted">
                        por {s.processadoPor.name ?? s.processadoPor.email}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-2">
                      {s.pixTxid && s.pixPayload && s.chavePixNormalizada && s.chavePixTipo && (
                        <AmpliarQrCodeButton
                          dados={{
                            saqueId: s.id,
                            investidorNome: s.investidorNome ?? s.user.name ?? s.user.email,
                            valor: s.valor,
                            moeda: s.moeda,
                            chavePixNormalizada: s.chavePixNormalizada,
                            chavePixTipo: s.chavePixTipo,
                            pixTxid: s.pixTxid,
                            pixPayload: s.pixPayload,
                          }}
                        />
                      )}
                      <SaqueActions saqueId={s.id} status={s.status} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
