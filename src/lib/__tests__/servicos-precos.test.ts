import { describe, it, expect } from "vitest";
import {
  TARIFA_CENTAVOS,
  CODIGOS_PACOTE_COMPLETO,
  SUBTOTAL_PACOTE_CENTAVOS,
  DESCONTO_PACOTE_MENSAL_CENTAVOS,
  VALOR_PACOTE_MENSAL_CENTAVOS,
  VALOR_PACOTE_ANUAL_CENTAVOS,
  calcularContratacaoIndividual,
  calcularPacoteCompleto,
  centavosParaReais,
} from "@/lib/servicos";

describe("Pacotes de Serviços — preços (critérios de aceite 6-10)", () => {
  it("a soma das 8 tarifas unitárias é exatamente R$ 52,63", () => {
    expect(SUBTOTAL_PACOTE_CENTAVOS).toBe(5263);
    expect(centavosParaReais(SUBTOTAL_PACOTE_CENTAVOS)).toBe(52.63);
  });

  it("cada tarifa individual bate com a tabela do documento", () => {
    expect(TARIFA_CENTAVOS.TRANSFERENCIA_USUARIOS).toBe(658);
    expect(TARIFA_CENTAVOS.REAPLICACAO_AUTOMATICA).toBe(658);
    expect(TARIFA_CENTAVOS.ASSESSORIA_CONTABIL).toBe(658);
    expect(TARIFA_CENTAVOS.ASSESSORIA_JURIDICA).toBe(658);
    expect(TARIFA_CENTAVOS.ASSESSORIA_TI).toBe(658);
    expect(TARIFA_CENTAVOS.APLICACAO_BENS).toBe(658);
    expect(TARIFA_CENTAVOS.DOAR_ENTIDADE).toBe(658);
    expect(TARIFA_CENTAVOS.PLANO_LIDERANCA).toBe(657);
  });

  it("pacote completo mensal: desconto de 5% = R$ 2,63 e valor final exatamente R$ 50,00", () => {
    const resumo = calcularPacoteCompleto("PACOTE_MENSAL");
    expect(resumo.subtotalCentavos).toBe(5263);
    expect(DESCONTO_PACOTE_MENSAL_CENTAVOS).toBe(263);
    expect(resumo.descontoCentavos).toBe(263);
    expect(resumo.valorFinalCentavos).toBe(5000);
    expect(centavosParaReais(resumo.valorFinalCentavos)).toBe(50);
    expect(VALOR_PACOTE_MENSAL_CENTAVOS).toBe(5000);
  });

  it("pacote completo anual: valor final fixo de R$ 550,00", () => {
    const resumo = calcularPacoteCompleto("PACOTE_ANUAL");
    expect(resumo.valorFinalCentavos).toBe(55000);
    expect(centavosParaReais(resumo.valorFinalCentavos)).toBe(550);
    expect(VALOR_PACOTE_ANUAL_CENTAVOS).toBe(55000);
  });

  it("contratação individual não aplica desconto, mesmo selecionando vários serviços", () => {
    const resumo = calcularContratacaoIndividual(["ASSESSORIA_CONTABIL", "ASSESSORIA_JURIDICA"]);
    expect(resumo.descontoCentavos).toBe(0);
    expect(resumo.subtotalCentavos).toBe(1316); // 658 + 658
    expect(resumo.valorFinalCentavos).toBe(1316);
  });

  it("contratação individual de um único serviço cobra a tarifa integral", () => {
    const resumo = calcularContratacaoIndividual(["PLANO_LIDERANCA"]);
    expect(resumo.valorFinalCentavos).toBe(657);
    expect(centavosParaReais(resumo.valorFinalCentavos)).toBe(6.57);
  });

  it("o pacote completo cobre exatamente os 8 serviços do documento, sem repetição", () => {
    expect(CODIGOS_PACOTE_COMPLETO).toHaveLength(8);
    expect(new Set(CODIGOS_PACOTE_COMPLETO).size).toBe(8);
  });
});
