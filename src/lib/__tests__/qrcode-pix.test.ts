import { describe, it, expect } from "vitest";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { gerarQrCodePng } from "@/lib/qrcode-pix";
import { gerarPayloadPix } from "@/lib/pix";
import { normalizarChavePix } from "@/lib/pix-chave";

function decodificarPng(png: Buffer): { data: string } | null {
  const imagem = PNG.sync.read(png);
  return jsQR(new Uint8ClampedArray(imagem.data), imagem.width, imagem.height);
}

describe("gerarQrCodePng — escaneabilidade", () => {
  it("gera um PNG válido (assinatura PNG correta)", async () => {
    const png = await gerarQrCodePng("00020126...payload de teste...6304ABCD");
    // Assinatura padrão de arquivo PNG: 89 50 4E 47 0D 0A 1A 0A
    expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  });

  it("o QR Code gerado é escaneável — decodifica de volta pro payload exato", async () => {
    const chave = normalizarChavePix("11144477735", "CPF");
    if (!chave.ok) throw new Error("chave de teste inválida");

    const payload = gerarPayloadPix({
      chave: chave.chaveNormalizada,
      beneficiario: "Investidor Teste",
      cidade: "JANDIRA",
      valor: 250.75,
      identificador: "SAQTESTEQRCODE123",
    });

    const png = await gerarQrCodePng(payload);
    const decodificado = decodificarPng(png);

    expect(decodificado).not.toBeNull();
    expect(decodificado?.data).toBe(payload);
  });

  it("o valor decodificado do QR Code bate com o valor original (54xx)", async () => {
    const payload = gerarPayloadPix({
      chave: "investidor@exemplo.com",
      beneficiario: "Fulano de Tal",
      cidade: "JANDIRA",
      valor: 1500.5,
      identificador: "SAQVALORTESTE",
    });
    const png = await gerarQrCodePng(payload);
    const decodificado = decodificarPng(png);
    expect(decodificado?.data).toContain("1500.50");
  });

  it("a chave Pix decodificada do QR Code bate com a chave normalizada original", async () => {
    const chave = normalizarChavePix("(11) 98529-9785", "TELEFONE");
    if (!chave.ok) throw new Error("chave de teste inválida");

    const payload = gerarPayloadPix({
      chave: chave.chaveNormalizada,
      beneficiario: "Fulano",
      cidade: "JANDIRA",
      valor: 10,
      identificador: "SAQCHAVETESTE",
    });
    const png = await gerarQrCodePng(payload);
    const decodificado = decodificarPng(png);
    expect(decodificado?.data).toContain(chave.chaveNormalizada);
  });
});
