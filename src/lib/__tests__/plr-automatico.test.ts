import { describe, it, expect } from "vitest";
import {
  gerarCronogramaDiario,
  FAIXA_SEGUNDA_A_QUINTA,
  FAIXA_SEXTA,
  FAIXA_FIM_DE_SEMANA,
} from "@/lib/plr-automatico";

function utc(ano: number, mes: number, dia: number): Date {
  return new Date(Date.UTC(ano, mes - 1, dia));
}

describe("gerarCronogramaDiario — motor de PLR automático", () => {
  it("a soma do cronograma bate exatamente com o percentual total (30 dias, como no exemplo dado)", () => {
    const cronograma = gerarCronogramaDiario(5, utc(2026, 9, 1), utc(2026, 9, 30));
    expect(cronograma).toHaveLength(30);
    const soma = cronograma.reduce((acc, d) => acc + d.percentual, 0);
    expect(soma).toBeCloseTo(5, 2);
  });

  it("repete 200 vezes com períodos/percentuais variados — soma sempre exata", () => {
    for (let i = 0; i < 200; i++) {
      const total = 1 + Math.random() * 9; // 1% a 10%
      const dias = 5 + Math.floor(Math.random() * 60); // 5 a 65 dias
      const inicio = utc(2026, 1, 1);
      const fim = new Date(inicio);
      fim.setUTCDate(fim.getUTCDate() + dias - 1);

      const cronograma = gerarCronogramaDiario(total, inicio, fim);
      expect(cronograma).toHaveLength(dias);
      const soma = cronograma.reduce((acc, d) => acc + d.percentual, 0);
      expect(soma).toBeCloseTo(total, 2);
    }
  });

  it("nenhum dia fica negativo, mesmo em cenários extremos (total baixo, período curto)", () => {
    for (let i = 0; i < 100; i++) {
      const cronograma = gerarCronogramaDiario(0.05, utc(2026, 3, 2), utc(2026, 3, 8)); // 1 semana
      for (const dia of cronograma) {
        expect(dia.percentual).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("cenário extremo que força o fallback (total baixo, período longo) — soma exata e nenhum dia negativo", () => {
    // Total bem menor que a soma mínima possível dos dias (65 dias × mínimo 0,05% já dá 3,25%)
    // força a última-dia-absorve a ficar negativa, caindo no caminho de fallback.
    for (let i = 0; i < 300; i++) {
      const cronograma = gerarCronogramaDiario(1, utc(2026, 1, 1), utc(2026, 3, 6)); // 65 dias
      const soma = cronograma.reduce((acc, d) => acc + d.percentual, 0);
      expect(soma).toBeCloseTo(1, 2);
      for (const dia of cronograma) {
        expect(dia.percentual).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("dias de segunda a quinta ficam dentro da faixa esperada (exceto o último dia do período, que absorve o resíduo)", () => {
    // Período longo o bastante pra ter bastante folga de arredondamento (resíduo pequeno).
    const cronograma = gerarCronogramaDiario(50, utc(2026, 1, 1), utc(2026, 6, 30));
    const semUltimo = cronograma.slice(0, -1);
    for (const dia of semUltimo) {
      const diaSemana = dia.data.getUTCDay();
      if (diaSemana >= 1 && diaSemana <= 4) {
        expect(dia.percentual).toBeGreaterThanOrEqual(FAIXA_SEGUNDA_A_QUINTA.min);
        expect(dia.percentual).toBeLessThanOrEqual(FAIXA_SEGUNDA_A_QUINTA.max + 0.001);
      }
    }
  });

  it("sextas-feiras ficam dentro da faixa mais alta (exceto quando caem no último dia do período)", () => {
    const cronograma = gerarCronogramaDiario(50, utc(2026, 1, 1), utc(2026, 6, 30));
    const semUltimo = cronograma.slice(0, -1);
    const sextas = semUltimo.filter((d) => d.data.getUTCDay() === 5);
    expect(sextas.length).toBeGreaterThan(0);
    for (const sexta of sextas) {
      expect(sexta.percentual).toBeGreaterThanOrEqual(FAIXA_SEXTA.min);
      expect(sexta.percentual).toBeLessThanOrEqual(FAIXA_SEXTA.max + 0.001);
    }
  });

  it("sábados e domingos ficam dentro da faixa mais baixa (exceto quando caem no último dia do período)", () => {
    const cronograma = gerarCronogramaDiario(50, utc(2026, 1, 1), utc(2026, 6, 30));
    const semUltimo = cronograma.slice(0, -1);
    const fimDeSemana = semUltimo.filter((d) => d.data.getUTCDay() === 0 || d.data.getUTCDay() === 6);
    expect(fimDeSemana.length).toBeGreaterThan(0);
    for (const dia of fimDeSemana) {
      expect(dia.percentual).toBeGreaterThanOrEqual(FAIXA_FIM_DE_SEMANA.min);
      expect(dia.percentual).toBeLessThanOrEqual(FAIXA_FIM_DE_SEMANA.max + 0.001);
    }
  });

  it("em média, sexta rende bem mais que um dia comum e que o fim de semana (verificação estatística da prioridade)", () => {
    // Período longo o bastante (2 anos) pra a média convergir e o teste não ficar instável.
    const cronograma = gerarCronogramaDiario(1000, utc(2024, 1, 1), utc(2025, 12, 31));
    const semUltimo = cronograma.slice(0, -1);

    const media = (dias: typeof semUltimo) => dias.reduce((acc, d) => acc + d.percentual, 0) / dias.length;

    const mediaSexta = media(semUltimo.filter((d) => d.data.getUTCDay() === 5));
    const mediaUtil = media(semUltimo.filter((d) => d.data.getUTCDay() >= 1 && d.data.getUTCDay() <= 4));
    const mediaFds = media(semUltimo.filter((d) => d.data.getUTCDay() === 0 || d.data.getUTCDay() === 6));

    expect(mediaSexta).toBeGreaterThan(mediaUtil);
    expect(mediaUtil).toBeGreaterThan(mediaFds);
  });

  it("período de um único dia recebe o percentual total inteiro", () => {
    const cronograma = gerarCronogramaDiario(3.5, utc(2026, 4, 10), utc(2026, 4, 10));
    expect(cronograma).toHaveLength(1);
    expect(cronograma[0].percentual).toBeCloseTo(3.5, 2);
  });

  it("cobre corretamente um período que atravessa a virada do mês", () => {
    const cronograma = gerarCronogramaDiario(2, utc(2026, 1, 30), utc(2026, 2, 2));
    expect(cronograma.map((d) => d.data.toISOString().slice(0, 10))).toEqual([
      "2026-01-30",
      "2026-01-31",
      "2026-02-01",
      "2026-02-02",
    ]);
  });
});
