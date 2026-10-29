import "dotenv/config";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { getResumoCarteira } from "@/lib/carteira";

/** O cartão "Rendimentos" do investidor deve mostrar só o PLR; o incentivo de liderança tem
 *  valores próprios. Antes, os dois vinham somados (R$ 32,44 de PLR + R$ 48,05 de incentivo
 *  apareciam como R$ 80,49 em "Rendimentos"), o que gerava confusão entre os investidores. */
describe("getResumoCarteira — PLR separado do incentivo de liderança", () => {
  let userId: string;

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: {
        email: `teste.plr.incentivo.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`,
        name: "Teste PLR x Incentivo",
        perfil: "LIDER",
        statusCadastro: "APROVADO",
      },
    });
    userId = user.id;
  });

  afterEach(async () => {
    await prisma.creditoCarteira.deleteMany({ where: { userId } });
    await prisma.aplicacao.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("separa o PLR do incentivo e mantém o total combinado pra saque/reaplicação", async () => {
    await prisma.aplicacao.create({
      data: { userId, valor: 1000, moeda: "BRL", status: "CONFIRMADA", liberaEm: new Date(Date.now() + 86400000) },
    });
    const agora = new Date();
    await prisma.creditoCarteira.createMany({
      data: [
        { userId, tipo: "RENDIMENTO", valor: 20, moeda: "BRL", origem: "PLR manual 0.1% (admin)", criadoEm: agora },
        { userId, tipo: "RENDIMENTO", valor: 12.44, moeda: "BRL", origem: "PLR manual 0.11% (admin)", criadoEm: agora },
        { userId, tipo: "RENDIMENTO", valor: 48.05, moeda: "BRL", origem: "Incentivo de liderança 0.1% (automático)", criadoEm: agora },
        // PLR já reaplicado: não conta em nenhum "disponível".
        { userId, tipo: "RENDIMENTO", valor: 5, moeda: "BRL", origem: "PLR manual 0.1% (admin)", criadoEm: agora, utilizadoEm: agora },
      ],
    });

    const r = await getResumoCarteira(userId);

    expect(r.plrDisponivel).toBeCloseTo(32.44, 2);
    expect(r.incentivoLiderancaDisponivel).toBeCloseTo(48.05, 2);
    // O total combinado continua existindo (é o que saque/reaplicação de rendimento consomem).
    expect(r.distribuicoesDisponiveis).toBeCloseTo(80.49, 2);
    expect(r.plrDisponivel + r.incentivoLiderancaDisponivel).toBeCloseTo(r.distribuicoesDisponiveis, 2);
    // Acumulado líquido só de PLR: os 5 já usados ficam de fora.
    expect(r.plrAcumulado).toBeCloseTo(32.44, 2);
  });

  it("o gráfico 'Evolução dos rendimentos' não soma o incentivo", async () => {
    await prisma.aplicacao.create({
      data: { userId, valor: 1000, moeda: "BRL", status: "CONFIRMADA", liberaEm: new Date(Date.now() + 86400000) },
    });
    await prisma.creditoCarteira.createMany({
      data: [
        { userId, tipo: "RENDIMENTO", valor: 10, moeda: "BRL", origem: "PLR manual 0.1% (admin)" },
        { userId, tipo: "RENDIMENTO", valor: 99, moeda: "BRL", origem: "Incentivo de liderança 0.1% (automático)" },
      ],
    });

    const r = await getResumoCarteira(userId);
    const totalGrafico = r.historicoRendimentos.reduce((a, p) => a + p.valor, 0);
    expect(totalGrafico).toBeCloseTo(10, 2);
  });
});
