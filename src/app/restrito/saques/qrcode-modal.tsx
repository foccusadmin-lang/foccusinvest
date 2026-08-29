"use client";

import { useState, useTransition } from "react";
import type { StatusSaque } from "@prisma/client";
import { formatMoeda } from "@/lib/format";
import { LABEL_TIPO_CHAVE_PIX, type TipoChavePixForm } from "@/lib/pix-chave";
import { aprovarSaque, marcarSaquePago } from "./actions";

export type DadosQrCodeModal = {
  saqueId: string;
  investidorNome: string;
  valor: number;
  moeda: string;
  chavePixNormalizada: string;
  chavePixTipo: TipoChavePixForm;
  pixTxid: string;
  pixPayload: string;
  status: StatusSaque;
};

export function AmpliarQrCodeButton({ onAbrir }: { onAbrir: () => void }) {
  return (
    <button
      onClick={onAbrir}
      className="rounded-lg bg-gold/15 px-3 py-1 text-xs font-semibold text-gold-light hover:bg-gold/25"
    >
      Ampliar QR Code
    </button>
  );
}

/** Modal do QR Code com fila: abre no item clicado e, depois de Aprovar/Marcar como pago, avança
 *  sozinho pro próximo pendente com QR Code — sem precisar fechar e reabrir a cada um. `fila` é a
 *  lista completa (na ordem exibida na tabela); `aberto` é o id do item atualmente mostrado. */
export function FilaQrCodeModal({
  fila,
  aberto,
  onMudarAberto,
}: {
  fila: DadosQrCodeModal[];
  aberto: string | null;
  onMudarAberto: (id: string | null) => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  if (!aberto) return null;
  const indice = fila.findIndex((d) => d.saqueId === aberto);
  const dados = fila[indice];
  if (!dados) return null;
  const proximo = fila[indice + 1] ?? null;
  const restantes = fila.length - indice - 1;

  function copiarPayload() {
    navigator.clipboard.writeText(dados.pixPayload).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  function confirmarEAvancar(acao: () => Promise<void>) {
    setErro(null);
    startTransition(async () => {
      try {
        await acao();
        onMudarAberto(proximo?.saqueId ?? null);
      } catch (e) {
        setErro((e as Error).message || "Não foi possível concluir. Tente novamente.");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => onMudarAberto(null)}
    >
      <div
        className="max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-surface p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {restantes > 0 && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Mais {restantes} na fila depois desta
          </p>
        )}
        <h3 className="text-lg font-semibold text-foreground">{dados.investidorNome}</h3>
        <p className="mt-1 text-2xl font-bold text-gold-light">{formatMoeda(dados.valor, dados.moeda as "BRL")}</p>

        <div className="mx-auto mt-4 flex h-[260px] w-[260px] items-center justify-center rounded-xl bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/restrito/saques/${dados.saqueId}/qrcode`}
            alt="QR Code Pix"
            width={236}
            height={236}
          />
        </div>

        <div className="mt-4 space-y-1 rounded-lg border border-border bg-surface-2 p-3 text-left text-xs">
          <p className="text-muted">
            Tipo da chave: <span className="text-foreground">{LABEL_TIPO_CHAVE_PIX[dados.chavePixTipo]}</span>
          </p>
          <p className="break-all text-muted">
            Chave: <span className="text-foreground">{dados.chavePixNormalizada}</span>
          </p>
          <p className="break-all text-muted">
            TXID: <span className="text-foreground">{dados.pixTxid}</span>
          </p>
        </div>

        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-left text-xs text-amber-200">
          Confira no aplicativo do banco o nome do favorecido, a chave Pix e o valor antes de
          confirmar o pagamento. Escanear o QR Code não significa que o saque foi pago.
        </p>

        {erro && <p className="mt-3 text-xs text-red-400">{erro}</p>}

        <div className="mt-4 flex flex-col gap-2">
          {dados.status === "SOLICITADO" && (
            <button
              disabled={isPending}
              onClick={() => confirmarEAvancar(() => aprovarSaque(dados.saqueId))}
              className="w-full rounded-lg bg-sky-500 px-3 py-2.5 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-50"
            >
              {isPending ? "Aprovando..." : proximo ? "Aprovar e ir para o próximo Pix" : "Aprovar"}
            </button>
          )}
          {dados.status === "AGUARDANDO_PAGAMENTO" && (
            <button
              disabled={isPending}
              onClick={() => confirmarEAvancar(() => marcarSaquePago(dados.saqueId))}
              className="w-full rounded-lg bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-50"
            >
              {isPending
                ? "Confirmando..."
                : proximo
                  ? "Já paguei — marcar como pago e ir para o próximo"
                  : "Já paguei — marcar como pago"}
            </button>
          )}

          <button
            onClick={copiarPayload}
            className="w-full rounded-lg bg-gold/20 px-3 py-2 text-xs font-semibold text-gold-light hover:bg-gold/30"
          >
            {copiado ? "Código copiado!" : "Copiar Pix Copia e Cola"}
          </button>
          <a
            href={`/restrito/saques/${dados.saqueId}/qrcode?download=1`}
            className="w-full rounded-lg bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/25"
          >
            Baixar QR Code (PNG)
          </a>
          <button
            onClick={() => onMudarAberto(null)}
            className="w-full rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-foreground hover:bg-white/15"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
