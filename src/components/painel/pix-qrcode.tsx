"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** QR Code + "Pix Copia e Cola" pra um payload Pix já pronto (ver lib/pix.ts). Gera a imagem no
 *  navegador (sem round-trip pro servidor) e dá um botão de copiar o código completo. */
export function PixQrCode({ payload }: { payload: string }) {
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    QRCode.toDataURL(payload, { margin: 1, width: 220 })
      .then((url) => {
        if (!cancelado) setImagemUrl(url);
      })
      .catch((e) => console.error("Falha ao gerar QR Code do Pix:", e));
    return () => {
      cancelado = true;
    };
  }, [payload]);

  function copiarCodigo() {
    navigator.clipboard.writeText(payload).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex h-[220px] w-[220px] items-center justify-center rounded-xl bg-white p-2">
        {imagemUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagemUrl} alt="QR Code Pix" width={204} height={204} />
        ) : (
          <span className="text-xs text-black/50">Gerando QR Code...</span>
        )}
      </div>
      <p className="text-center text-xs text-muted">
        Escaneie com o app do seu banco, ou use o código Pix Copia e Cola abaixo.
      </p>
      <button
        type="button"
        onClick={copiarCodigo}
        className="w-full rounded-lg bg-gold/20 px-3 py-2 text-xs font-semibold text-gold-light hover:bg-gold/30"
      >
        {copiado ? "Código copiado!" : "Copiar código Pix (Copia e Cola)"}
      </button>
    </div>
  );
}
