import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatMoeda, formatData } from "@/lib/format";
import { LABEL_TIPO_CHAVE_PIX, type TipoChavePixForm } from "@/lib/pix-chave";

const LABEL_TIPO: Record<string, string> = { CAPITAL: "Capital", RENDIMENTO: "Rendimento", BONUS: "Bônus" };
const LABEL_STATUS: Record<string, string> = {
  SOLICITADO: "Solicitado",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGO: "Pago",
  RECUSADO: "Recusado",
  CANCELADO: "Cancelado",
};

export type SaqueParaPdf = {
  nome: string;
  valor: number;
  moeda: string;
  tipo: string;
  status: string;
  chavePixNormalizada: string | null;
  chavePixTipo: TipoChavePixForm | null;
  criadoEm: Date;
  pixTxid: string | null;
  pixQrCodePng: Uint8Array | null;
};

const PAGINA_LARGURA = 595.28; // A4
const PAGINA_ALTURA = 841.89;
const MARGEM = 36;
const QR_TAMANHO = 170;

function limitarTexto(texto: string, tamanhoMaximo: number): string {
  return texto.length > tamanhoMaximo ? `${texto.slice(0, tamanhoMaximo - 1)}…` : texto;
}

/**
 * Monta o PDF com os saques Pix de uma sexta-feira, 4 QR Codes por página (grade 2x2) — cada
 * grupo (ex: "Aguardando pagamento" / "Já pagos") sempre começa em página nova, pra nunca
 * misturar pedidos pagos com pendentes na mesma folha.
 */
export async function gerarPdfSaques(
  tituloSexta: string,
  grupos: { titulo: string; itens: SaqueParaPdf[] }[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fonte = await doc.embedFont(StandardFonts.Helvetica);
  const fonteNegrito = await doc.embedFont(StandardFonts.HelveticaBold);

  for (const grupo of grupos) {
    for (let i = 0; i < grupo.itens.length; i += 4) {
      const pagina = doc.addPage([PAGINA_LARGURA, PAGINA_ALTURA]);
      pagina.drawText(`Saques Pix — ${tituloSexta} — ${grupo.titulo}`, {
        x: MARGEM,
        y: PAGINA_ALTURA - MARGEM,
        size: 12,
        font: fonteNegrito,
        color: rgb(0, 0, 0),
      });

      const bloco = grupo.itens.slice(i, i + 4);
      const larguraCelula = (PAGINA_LARGURA - MARGEM * 2) / 2;
      const alturaCelula = (PAGINA_ALTURA - MARGEM * 2 - 40) / 2;

      for (let j = 0; j < bloco.length; j++) {
        const saque = bloco[j];
        const col = j % 2;
        const row = Math.floor(j / 2);
        const x = MARGEM + col * larguraCelula;
        const yTopo = PAGINA_ALTURA - MARGEM - 40 - row * alturaCelula;

        const valor = formatMoeda(saque.valor, saque.moeda as "BRL");
        const tipo = LABEL_TIPO[saque.tipo] ?? saque.tipo;
        const status = LABEL_STATUS[saque.status] ?? saque.status;
        const tipoChaveLabel = saque.chavePixTipo ? LABEL_TIPO_CHAVE_PIX[saque.chavePixTipo] : "—";
        const chave = saque.chavePixNormalizada ?? "—";

        if (saque.pixQrCodePng) {
          const imagem = await doc.embedPng(saque.pixQrCodePng);
          pagina.drawImage(imagem, {
            x: x + (larguraCelula - QR_TAMANHO) / 2,
            y: yTopo - QR_TAMANHO,
            width: QR_TAMANHO,
            height: QR_TAMANHO,
          });
        }

        const linhas = [
          { texto: saque.nome, negrito: true, tamanho: 10 },
          { texto: `${tipo} — ${valor}`, negrito: false, tamanho: 9 },
          { texto: `Chave (${tipoChaveLabel}): ${chave}`, negrito: false, tamanho: 8 },
          { texto: `Solicitado: ${formatData(saque.criadoEm)}`, negrito: false, tamanho: 8 },
          { texto: `Status: ${status}`, negrito: false, tamanho: 8 },
          { texto: `TXID: ${saque.pixTxid ?? "—"}`, negrito: false, tamanho: 7 },
        ];
        let yTexto = yTopo - QR_TAMANHO - 12;
        for (const linha of linhas) {
          pagina.drawText(limitarTexto(linha.texto, 46), {
            x: x + (larguraCelula - QR_TAMANHO) / 2,
            y: yTexto,
            size: linha.tamanho,
            font: linha.negrito ? fonteNegrito : fonte,
            color: rgb(0, 0, 0),
          });
          yTexto -= linha.tamanho + 3;
        }
      }
    }
  }

  return doc.save();
}
