import "dotenv/config";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { reaplicarSaldoDisponivel } from "@/lib/carteira";

/**
 * Cobre um bug real encontrado em produção: quando reaplicarSaldoDisponivel só consumia PARTE de
 * uma linha de crédito (dividindo ela em duas — a parte que sobra + a parte consumida), a parte
 * consumida virava uma linha NOVA sem preservar `criadoEm` da linha original — pegava a data de
 * QUANDO A REAPLICAÇÃO RODOU em vez de quando o rendimento foi de fato lançado. Como a
 * reaplicação automática roda em qualquer carregamento de painel, isso podia (e aconteceu de
 * verdade) datar um fragmento num sábado ou domingo, fazendo parecer que PLR tinha sido lançado
 * em fim de semana quando na verdade não foi — só o rótulo de data do fragmento é que estava
 * errado. Corrigido preservando `criadoEm` da linha original em toda divisão parcial.
 */
describe("reaplicarSaldoDisponivel — preserva a data original ao dividir um crédito parcialmente consumido", () => {
  let userId: string;

  beforeEach(async () => {
    const stamp = `${Date.now()}.${Math.random().toString(36).slice(2)}`;
    const user = await prisma.user.create({
      data: { email: `teste.reaplicacao.${stamp}@example.com`, name: "Teste", perfil: "USUARIO", statusCadastro: "APROVADO" },
    });
    userId = user.id;
  });

  afterEach(async () => {
    await prisma.creditoCarteira.deleteMany({ where: { userId } });
    await prisma.aplicacao.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("o fragmento consumido mantém o criadoEm do crédito original, não a data em que a reaplicação rodou", async () => {
    const dataOriginal = new Date("2020-03-06T15:00:00.000Z"); // uma sexta-feira, bem no passado
    const credito = await prisma.creditoCarteira.create({
      data: {
        userId,
        tipo: "RENDIMENTO",
        valor: 100,
        moeda: "BRL",
        origem: "PLR manual 0.5% (admin)",
        criadoEm: dataOriginal,
      },
    });

    // Reaplica só uma FRAÇÃO do crédito (60 de 100) — força a divisão em duas linhas.
    await prisma.$transaction((tx) => reaplicarSaldoDisponivel(tx, userId, 60));

    const linhas = await prisma.creditoCarteira.findMany({ where: { userId }, orderBy: { valor: "asc" } });
    expect(linhas).toHaveLength(2);

    const consumida = linhas.find((l) => l.id !== credito.id)!;
    const restante = linhas.find((l) => l.id === credito.id)!;

    expect(consumida.valor).toBeCloseTo(60, 2);
    expect(consumida.utilizadoEm).not.toBeNull();
    expect(consumida.origem).toBe("PLR manual 0.5% (admin)");
    // O ponto central do teste: o fragmento consumido preserva a data do lançamento original,
    // não a data de agora (quando a reaplicação rodou).
    expect(consumida.criadoEm.getTime()).toBe(dataOriginal.getTime());

    expect(restante.valor).toBeCloseTo(40, 2);
    expect(restante.utilizadoEm).toBeNull();
    expect(restante.criadoEm.getTime()).toBe(dataOriginal.getTime());
  });
});
