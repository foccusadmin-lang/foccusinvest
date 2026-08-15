/**
 * Gera o payload Pix "Copia e Cola" (BR Code / EMV QRCPS-MPM), conforme o manual do Bacen
 * (https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf).
 * String no formato TLV (tag-length-value), com CRC16-CCITT no final — o mesmo texto que
 * qualquer banco entende ao colar em "Pix Copia e Cola", e que dá origem ao QR Code.
 */

function tlv(id: string, valor: string): string {
  const tamanho = valor.length.toString().padStart(2, "0");
  return `${id}${tamanho}${valor}`;
}

/** CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF) — checksum exigido no final do payload. */
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Remove acentos e qualquer caractere fora do padrão ASCII simples aceito pelo Bacen, e corta
 *  no tamanho máximo do campo. */
function sanitizar(texto: string, tamanhoMaximo: number): string {
  return texto
    .normalize("NFD") // separa acento de letra (ex: "É" -> "E" + acento combinante)
    .replace(/[^a-zA-Z0-9 ]/g, "") // remove os acentos combinantes e qualquer outro símbolo
    .trim()
    .toUpperCase()
    .slice(0, tamanhoMaximo);
}

export function gerarPayloadPix(params: {
  chave: string;
  beneficiario: string;
  cidade: string;
  valor: number;
  identificador?: string;
}): string {
  const { chave, beneficiario, cidade, valor, identificador } = params;

  const merchantAccountInfo = [
    tlv("00", "br.gov.bcb.pix"),
    tlv("01", chave),
  ].join("");

  const additionalDataField = tlv("05", identificador ? sanitizar(identificador, 25) : "***");

  const camposSemCrc = [
    tlv("00", "01"), // Payload Format Indicator
    tlv("26", merchantAccountInfo), // Merchant Account Information (Pix)
    tlv("52", "0000"), // Merchant Category Code
    tlv("53", "986"), // Transaction Currency (BRL)
    tlv("54", valor.toFixed(2)), // Transaction Amount
    tlv("58", "BR"), // Country Code
    tlv("59", sanitizar(beneficiario, 25)), // Merchant Name
    tlv("60", sanitizar(cidade, 15)), // Merchant City
    tlv("62", additionalDataField), // Additional Data Field
  ].join("");

  // O campo do CRC entra no cálculo já com seu próprio ID+tamanho, mas sem o valor (fixo "6304").
  const payloadParaCrc = `${camposSemCrc}6304`;
  const crc = crc16(payloadParaCrc);

  return `${payloadParaCrc}${crc}`;
}
