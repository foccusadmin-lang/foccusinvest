import { describe, it, expect } from "vitest";
import { gerarPayloadPix } from "@/lib/pix";

/** CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF) — reimplementado aqui, independente do
 *  código de produção, só pra conferir de fora que o CRC embutido no payload bate. */
function crc16Referencia(texto: string): string {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

describe("gerarPayloadPix — CRC16", () => {
  it("gera um CRC16 válido no final do payload (bate com implementação de referência)", () => {
    const payload = gerarPayloadPix({
      chave: "+5511985299785",
      beneficiario: "Investidor Teste",
      cidade: "JANDIRA",
      valor: 123.45,
      identificador: "SAQTESTE123",
    });

    const crcEmbutido = payload.slice(-4);
    const payloadSemCrc = payload.slice(0, -4);
    expect(crc16Referencia(payloadSemCrc)).toBe(crcEmbutido);
  });

  it("payloads diferentes geram CRCs diferentes (não é um valor fixo)", () => {
    const payloadA = gerarPayloadPix({ chave: "a@a.com", beneficiario: "A", cidade: "SP", valor: 10 });
    const payloadB = gerarPayloadPix({ chave: "b@b.com", beneficiario: "B", cidade: "SP", valor: 20 });
    expect(payloadA.slice(-4)).not.toBe(payloadB.slice(-4));
  });
});

describe("gerarPayloadPix — conteúdo do BR Code", () => {
  it("contém o GUI oficial, moeda BRL (986), país BR e o valor com duas casas decimais", () => {
    const payload = gerarPayloadPix({
      chave: "+5511985299785",
      beneficiario: "Investidor Teste",
      cidade: "JANDIRA",
      valor: 250,
    });

    expect(payload).toContain("br.gov.bcb.pix");
    expect(payload).toContain("5303986"); // tag 53 (moeda), tamanho 03, valor 986
    expect(payload).toContain("5802BR"); // tag 58 (país), tamanho 02, valor BR
    expect(payload).toContain("5406250.00"); // tag 54 (valor), tamanho 06, "250.00"
  });

  it("carrega a chave Pix normalizada dentro do campo Merchant Account Information", () => {
    const payload = gerarPayloadPix({
      chave: "11144477735",
      beneficiario: "Fulano de Tal",
      cidade: "JANDIRA",
      valor: 100,
    });
    expect(payload).toContain("11144477735");
  });

  it("carrega o valor exato com duas casas decimais, mesmo pra valores com centavos", () => {
    const payload = gerarPayloadPix({
      chave: "a@a.com",
      beneficiario: "Teste",
      cidade: "SP",
      valor: 1999.9,
    });
    expect(payload).toContain("54071999.90");
  });

  it("carrega o TXID (identificador) dentro do payload, respeitando o limite de 25 caracteres", () => {
    const payload = gerarPayloadPix({
      chave: "a@a.com",
      beneficiario: "Teste",
      cidade: "SP",
      valor: 10,
      identificador: "SAQABCDEF1234567890XXXXX", // 25 chars
    });
    expect(payload).toContain("SAQABCDEF1234567890XXXXX");
  });
});
