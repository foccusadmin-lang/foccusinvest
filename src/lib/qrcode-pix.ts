import QRCode from "qrcode";

/** Gera a imagem PNG (bytes) do QR Code a partir de um payload Pix "Copia e Cola" já pronto —
 *  server-side (biblioteca `qrcode`, a mesma já usada no navegador pra Nova Aplicação), pra
 *  poder salvar o PNG junto da solicitação de saque e reaproveitar em PDF/ZIP depois. */
export async function gerarQrCodePng(payload: string): Promise<Buffer<ArrayBuffer>> {
  const buffer = await QRCode.toBuffer(payload, {
    type: "png",
    margin: 2,
    width: 480,
    errorCorrectionLevel: "M",
  });
  // Buffer.from(Uint8Array) força um ArrayBuffer "de verdade" por baixo (em vez do
  // ArrayBufferLike genérico que `qrcode` devolve) — é o que o Prisma exige pra campos Bytes.
  return Buffer.from(new Uint8Array(buffer));
}
