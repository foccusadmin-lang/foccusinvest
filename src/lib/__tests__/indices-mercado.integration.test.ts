import "dotenv/config";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { salvarBenchmark, excluirBenchmark, obterComparativoRentabilidade } from "@/lib/indices-mercado";

describe("Rentabilidade vs Índices — comparativo factual", () => {
  let adminId: string;
  let distribuicaoIds: string[];
  let benchmarkIds: string[];

  beforeEach(async () => {
    const stamp = `${Date.now()}.${Math.random().toString(36).slice(2)}`;
    const admin = await prisma.user.create({
      data: {
        email: `teste.indices.admin.${stamp}@example.com`,
        name: "Teste Admin",
        perfil: "ADMIN",
        statusCadastro: "APROVADO",
      },
    });
    adminId = admin.id;
    distribuicaoIds = [];
    benchmarkIds = [];
  });

  afterEach(async () => {
    await prisma.distribuicaoMensal.deleteMany({ where: { id: { in: distribuicaoIds } } });
    await prisma.benchmarkMercado.deleteMany({ where: { id: { in: benchmarkIds } } });
    await prisma.user.deleteMany({ where: { id: adminId } });
  });

  function primeiroDiaMesAtual(): Date {
    const agora = new Date();
    return new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1));
  }

  it("junta a rentabilidade real distribuída no mês com os índices lançados pra esse mês", async () => {
    const mesAtual = primeiroDiaMesAtual();

    const dist = await prisma.distribuicaoMensal.create({
      data: {
        periodoInicio: mesAtual,
        periodoFim: new Date(mesAtual.getTime() + 20 * 86400000),
        percentual: 2.1,
        valorTotal: 1000,
        resultadoApurado: "Teste",
        status: "ATIVA",
        criadoPorId: adminId,
      },
    });
    distribuicaoIds.push(dist.id);

    const mesStr = `${mesAtual.getUTCFullYear()}-${String(mesAtual.getUTCMonth() + 1).padStart(2, "0")}`;
    await salvarBenchmark({ indicador: "CDI", mes: mesStr, valorPercentual: 0.95, criadoPorId: adminId });
    await salvarBenchmark({ indicador: "IPCA", mes: mesStr, valorPercentual: 0.4, criadoPorId: adminId });
    const criados = await prisma.benchmarkMercado.findMany({ where: { mes: mesAtual } });
    benchmarkIds.push(...criados.map((c) => c.id));

    const serie = await obterComparativoRentabilidade(3);
    const pontoDoMes = serie[serie.length - 1];

    expect(pontoDoMes.foccus).toBeCloseTo(2.1, 2);
    expect(pontoDoMes.valores.CDI).toBeCloseTo(0.95, 2);
    expect(pontoDoMes.valores.IPCA).toBeCloseTo(0.4, 2);
    expect(pontoDoMes.valores.CDB).toBeUndefined();
  });

  it("soma múltiplas distribuições lançadas no mesmo mês", async () => {
    const mesAtual = primeiroDiaMesAtual();
    const d1 = await prisma.distribuicaoMensal.create({
      data: {
        periodoInicio: mesAtual,
        periodoFim: new Date(mesAtual.getTime() + 10 * 86400000),
        percentual: 1.0,
        valorTotal: 500,
        resultadoApurado: "Teste",
        status: "ATIVA",
        criadoPorId: adminId,
      },
    });
    const d2 = await prisma.distribuicaoMensal.create({
      data: {
        periodoInicio: new Date(mesAtual.getTime() + 15 * 86400000),
        periodoFim: new Date(mesAtual.getTime() + 25 * 86400000),
        percentual: 0.8,
        valorTotal: 500,
        resultadoApurado: "Teste",
        status: "ATIVA",
        criadoPorId: adminId,
      },
    });
    distribuicaoIds.push(d1.id, d2.id);

    const serie = await obterComparativoRentabilidade(1);
    expect(serie[0].foccus).toBeCloseTo(1.8, 2);
  });

  it("mês sem nenhuma distribuição lançada aparece como null, não como zero", async () => {
    const serie = await obterComparativoRentabilidade(1);
    expect(serie[0].foccus).toBeNull();
  });

  it("salvarBenchmark faz upsert — relançar o mesmo índice/mês substitui o valor anterior", async () => {
    const mesAtual = primeiroDiaMesAtual();
    const mesStr = `${mesAtual.getUTCFullYear()}-${String(mesAtual.getUTCMonth() + 1).padStart(2, "0")}`;

    await salvarBenchmark({ indicador: "IBOVESPA", mes: mesStr, valorPercentual: 1.0, criadoPorId: adminId });
    await salvarBenchmark({ indicador: "IBOVESPA", mes: mesStr, valorPercentual: 1.3, criadoPorId: adminId });

    const registros = await prisma.benchmarkMercado.findMany({ where: { indicador: "IBOVESPA", mes: mesAtual } });
    benchmarkIds.push(...registros.map((r) => r.id));

    expect(registros).toHaveLength(1);
    expect(registros[0].valorPercentual).toBeCloseTo(1.3, 2);
  });

  it("excluirBenchmark remove o lançamento", async () => {
    const mesAtual = primeiroDiaMesAtual();
    const mesStr = `${mesAtual.getUTCFullYear()}-${String(mesAtual.getUTCMonth() + 1).padStart(2, "0")}`;
    await salvarBenchmark({ indicador: "CDB", mes: mesStr, valorPercentual: 1.0, criadoPorId: adminId });
    const registro = await prisma.benchmarkMercado.findFirstOrThrow({ where: { indicador: "CDB", mes: mesAtual } });

    await excluirBenchmark(registro.id);

    const depois = await prisma.benchmarkMercado.findUnique({ where: { id: registro.id } });
    expect(depois).toBeNull();
  });

  it("recusa mês em formato inválido", async () => {
    const resultado = await salvarBenchmark({
      indicador: "CDI",
      mes: "2026/08",
      valorPercentual: 1,
      criadoPorId: adminId,
    });
    expect(resultado.error).toBeDefined();
  });

  describe("índice FOCCUS — histórico manual como fallback", () => {
    it("mês sem Distribuição usa o histórico manual, marcado como origem 'manual'", async () => {
      const mesAtual = primeiroDiaMesAtual();
      const mesStr = `${mesAtual.getUTCFullYear()}-${String(mesAtual.getUTCMonth() + 1).padStart(2, "0")}`;

      const resultado = await salvarBenchmark({
        indicador: "FOCCUS",
        mes: mesStr,
        valorPercentual: 1.85,
        criadoPorId: adminId,
      });
      expect(resultado.error).toBeUndefined();
      const registro = await prisma.benchmarkMercado.findFirstOrThrow({ where: { indicador: "FOCCUS", mes: mesAtual } });
      benchmarkIds.push(registro.id);

      const serie = await obterComparativoRentabilidade(1);
      expect(serie[0].foccus).toBeCloseTo(1.85, 2);
      expect(serie[0].foccusOrigem).toBe("manual");
      expect(serie[0].valores.FOCCUS).toBeUndefined(); // nunca aparece como "índice de mercado"
    });

    it("Distribuição real sempre tem prioridade sobre o histórico manual, mesmo que o manual exista", async () => {
      const mesAtual = primeiroDiaMesAtual();
      const mesStr = `${mesAtual.getUTCFullYear()}-${String(mesAtual.getUTCMonth() + 1).padStart(2, "0")}`;

      // Sem Distribuição ainda: lança o manual primeiro (isso é permitido).
      await salvarBenchmark({ indicador: "FOCCUS", mes: mesStr, valorPercentual: 1.0, criadoPorId: adminId });
      const registro = await prisma.benchmarkMercado.findFirstOrThrow({ where: { indicador: "FOCCUS", mes: mesAtual } });
      benchmarkIds.push(registro.id);

      // Agora lança a Distribuição real do mesmo mês.
      const dist = await prisma.distribuicaoMensal.create({
        data: {
          periodoInicio: mesAtual,
          periodoFim: new Date(mesAtual.getTime() + 10 * 86400000),
          percentual: 2.5,
          valorTotal: 1000,
          resultadoApurado: "Teste",
          status: "ATIVA",
          criadoPorId: adminId,
        },
      });
      distribuicaoIds.push(dist.id);

      const serie = await obterComparativoRentabilidade(1);
      expect(serie[0].foccus).toBeCloseTo(2.5, 2); // real, não o 1.0 manual
      expect(serie[0].foccusOrigem).toBe("distribuicao");
    });

    it("recusa lançar histórico manual num mês que já tem Distribuição real", async () => {
      const mesAtual = primeiroDiaMesAtual();
      const mesStr = `${mesAtual.getUTCFullYear()}-${String(mesAtual.getUTCMonth() + 1).padStart(2, "0")}`;

      const dist = await prisma.distribuicaoMensal.create({
        data: {
          periodoInicio: mesAtual,
          periodoFim: new Date(mesAtual.getTime() + 10 * 86400000),
          percentual: 2.0,
          valorTotal: 1000,
          resultadoApurado: "Teste",
          status: "ATIVA",
          criadoPorId: adminId,
        },
      });
      distribuicaoIds.push(dist.id);

      const resultado = await salvarBenchmark({
        indicador: "FOCCUS",
        mes: mesStr,
        valorPercentual: 5,
        criadoPorId: adminId,
      });
      expect(resultado.error).toBeDefined();

      const registro = await prisma.benchmarkMercado.findFirst({ where: { indicador: "FOCCUS", mes: mesAtual } });
      expect(registro).toBeNull(); // nada foi salvo
    });

    it("mês sem Distribuição e sem histórico manual continua null, origem null", async () => {
      const serie = await obterComparativoRentabilidade(1);
      expect(serie[0].foccus).toBeNull();
      expect(serie[0].foccusOrigem).toBeNull();
    });
  });
});
