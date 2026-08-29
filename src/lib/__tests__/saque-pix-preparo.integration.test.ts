import "dotenv/config";
import { describe, it, expect } from "vitest";
import { prepararDadosSaquePix } from "@/lib/saque-pix";
import { PNG } from "pngjs";
import jsQR from "jsqr";

/** Exercita a função central (`prepararDadosSaquePix`) exatamente como os três fluxos reais de
 *  solicitação de saque a chamam — contra a configuração real do banco de desenvolvimento
 *  (cidade/regra da sexta), sem gravar nada (não cria SolicitacaoSaque, só gera os dados). */
describe("prepararDadosSaquePix — fluxo completo", () => {
  it("gera chave normalizada, payload, QR Code escaneável, TXID e data programada consistentes", async () => {
    const resultado = await prepararDadosSaquePix({
      investidorNome: "Investidor de Teste",
      investidorEmail: "teste.preparo@example.com",
      valor: 333.33,
      chavePixTexto: "(11) 98529-9785",
      chavePixTipo: "TELEFONE",
    });

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    const { dados } = resultado;
    expect(dados.chavePixNormalizada).toBe("+5511985299785");
    expect(dados.valorFinal).toBe(333.33);
    expect(dados.pixTxid.length).toBeLessThanOrEqual(25);
    expect(dados.pixPayload).toContain("+5511985299785");
    expect(dados.pixPayload).toContain("333.33");
    expect(dados.dataProgramadaPagamento.getTime()).toBeGreaterThan(Date.now() - 24 * 60 * 60 * 1000);

    // O QR Code de verdade decodifica pro mesmo payload salvo.
    const png = PNG.sync.read(Buffer.from(dados.pixQrCodePng));
    const decodificado = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(decodificado?.data).toBe(dados.pixPayload);
  });

  it("recusa chave Pix inválida sem gerar QR Code nenhum", async () => {
    const resultado = await prepararDadosSaquePix({
      investidorNome: "Investidor de Teste",
      investidorEmail: "teste.preparo@example.com",
      valor: 100,
      chavePixTexto: "111.444.777-99", // dígito verificador inválido
      chavePixTipo: "CPF",
    });

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error).toMatch(/cpf inválido/i);
  });
});
