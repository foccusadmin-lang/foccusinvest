import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { gerarPdfSaques, type SaqueParaPdf } from "@/lib/saques-pdf";
import { gerarQrCodePng } from "@/lib/qrcode-pix";
import { gerarPayloadPix } from "@/lib/pix";

async function saqueDeTeste(nome: string, valor: number): Promise<SaqueParaPdf> {
  const payload = gerarPayloadPix({ chave: "a@a.com", beneficiario: nome, cidade: "JANDIRA", valor });
  const png = await gerarQrCodePng(payload);
  return {
    nome,
    valor,
    moeda: "BRL",
    tipo: "CAPITAL",
    status: "AGUARDANDO_PAGAMENTO",
    chavePixNormalizada: "a@a.com",
    chavePixTipo: "EMAIL",
    criadoEm: new Date("2026-08-21T12:00:00-03:00"),
    pixTxid: `SAQ${nome.replace(/\s/g, "").toUpperCase()}`,
    pixQrCodePng: new Uint8Array(png),
  };
}

describe("gerarPdfSaques", () => {
  it("gera um PDF válido com 4 QR Codes por página", async () => {
    const itens = await Promise.all(
      Array.from({ length: 5 }, (_, i) => saqueDeTeste(`Investidor ${i + 1}`, 100 * (i + 1)))
    );

    const bytes = await gerarPdfSaques("sexta-feira 21/08/2026", [
      { titulo: "Aguardando pagamento", itens },
    ]);

    // Assinatura de arquivo PDF.
    expect(Buffer.from(bytes.slice(0, 5)).toString("ascii")).toBe("%PDF-");

    const doc = await PDFDocument.load(bytes);
    // 5 itens / 4 por página = 2 páginas.
    expect(doc.getPageCount()).toBe(2);
  });

  it("nunca mistura pago com pendente na mesma página — cada grupo vira páginas próprias", async () => {
    const pendentes = await Promise.all([saqueDeTeste("Pendente 1", 100)]);
    const pagos = await Promise.all([saqueDeTeste("Pago 1", 200)]);

    const bytes = await gerarPdfSaques("sexta-feira 21/08/2026", [
      { titulo: "Aguardando pagamento", itens: pendentes },
      { titulo: "Já pagos", itens: pagos },
    ]);

    const doc = await PDFDocument.load(bytes);
    // 1 pendente (1 página) + 1 pago (1 página) = 2 páginas, nunca uma só misturando os dois.
    expect(doc.getPageCount()).toBe(2);
  });
});
