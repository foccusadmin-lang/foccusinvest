import "dotenv/config";
import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";

/**
 * Testa diretamente a reivindicação atômica que corrige a duplicidade do incentivo de liderança
 * automático (LiberacaoIncentivoDiaria.dia é único) — não passa por
 * liberarIncentivoAutomaticoSeNecessario nem toca ConfiguracaoSistema.modoIncentivoLideranca,
 * porque essa função credita TODOS os líderes reais cadastrados: rodar o fluxo inteiro contra o
 * banco compartilhado (dev/prod) arriscaria creditar investidores de verdade se coincidisse com
 * alguém acessando o painel administrativo ao mesmo tempo. O mecanismo testado aqui é exatamente
 * o que garante, na produção, que só uma liberação aconteça por dia mesmo com chamadas
 * concorrentes (cron + páginas carregadas ao mesmo tempo).
 */
describe("LiberacaoIncentivoDiaria — reivindicação atômica (sem tocar líderes reais)", () => {
  // Data bem distante de qualquer dia real, exclusiva desse teste — nunca colide com uma
  // reivindicação de verdade feita pela produção.
  const diaDeTeste = new Date("1999-01-01T00:00:00-03:00");

  afterEach(async () => {
    await prisma.liberacaoIncentivoDiaria.deleteMany({ where: { dia: diaDeTeste } });
  });

  it("duas reivindicações simultâneas pro mesmo dia: só uma consegue criar o marcador", async () => {
    const resultados = await Promise.allSettled([
      prisma.liberacaoIncentivoDiaria.create({ data: { dia: diaDeTeste } }),
      prisma.liberacaoIncentivoDiaria.create({ data: { dia: diaDeTeste } }),
    ]);

    const sucesso = resultados.filter((r) => r.status === "fulfilled");
    const falha = resultados.filter((r) => r.status === "rejected");
    expect(sucesso).toHaveLength(1);
    expect(falha).toHaveLength(1);
    expect((falha[0] as PromiseRejectedResult).reason?.code).toBe("P2002");

    const marcadores = await prisma.liberacaoIncentivoDiaria.findMany({ where: { dia: diaDeTeste } });
    expect(marcadores).toHaveLength(1);
  });

  it("reivindicar o mesmo dia de novo depois (sequencial, não concorrente) também falha", async () => {
    await prisma.liberacaoIncentivoDiaria.create({ data: { dia: diaDeTeste } });

    await expect(prisma.liberacaoIncentivoDiaria.create({ data: { dia: diaDeTeste } })).rejects.toMatchObject({
      code: "P2002",
    });
  });

  it("dias diferentes não colidem entre si", async () => {
    const outroDia = new Date("1999-01-02T00:00:00-03:00");
    await prisma.liberacaoIncentivoDiaria.create({ data: { dia: diaDeTeste } });
    await expect(prisma.liberacaoIncentivoDiaria.create({ data: { dia: outroDia } })).resolves.toBeDefined();
    await prisma.liberacaoIncentivoDiaria.deleteMany({ where: { dia: outroDia } });
  });
});
