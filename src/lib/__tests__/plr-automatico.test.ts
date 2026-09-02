import { describe, it, expect } from "vitest";
import { gerarCronogramaDiario, LIMITE_MAXIMO_DIARIO } from "@/lib/plr-automatico";

function utc(ano: number, mes: number, dia: number): Date {
  return new Date(Date.UTC(ano, mes - 1, dia));
}

describe("gerarCronogramaDiario — motor de PLR automático", () => {
  it("a soma do cronograma bate exatamente com o percentual total (29 dias, campanha real 02/09-30/09)", () => {
    const cronograma = gerarCronogramaDiario(5, utc(2026, 9, 2), utc(2026, 9, 30));
    expect(cronograma).toHaveLength(29);
    const soma = cronograma.reduce((acc, d) => acc + d.percentual, 0);
    expect(soma).toBeCloseTo(5, 2);
  });

  it("repete 200 vezes com períodos/percentuais variados (sempre dentro do máximo possível) — soma sempre exata", () => {
    for (let i = 0; i < 200; i++) {
      const dias = 5 + Math.floor(Math.random() * 60); // 5 a 65 dias
      const maximoPossivel = dias * LIMITE_MAXIMO_DIARIO;
      const total = 0.1 + Math.random() * (maximoPossivel - 0.1);
      const inicio = utc(2026, 1, 1);
      const fim = new Date(inicio);
      fim.setUTCDate(fim.getUTCDate() + dias - 1);

      const cronograma = gerarCronogramaDiario(total, inicio, fim);
      expect(cronograma).toHaveLength(dias);
      const soma = cronograma.reduce((acc, d) => acc + d.percentual, 0);
      expect(soma).toBeCloseTo(total, 2);
    }
  });

  it("nenhum dia fica negativo ou passa do teto, mesmo em cenários extremos (total baixo, período curto)", () => {
    for (let i = 0; i < 100; i++) {
      const cronograma = gerarCronogramaDiario(0.05, utc(2026, 3, 2), utc(2026, 3, 8)); // 1 semana
      for (const dia of cronograma) {
        expect(dia.percentual).toBeGreaterThanOrEqual(0);
        expect(dia.percentual).toBeLessThanOrEqual(LIMITE_MAXIMO_DIARIO);
      }
    }
  });

  it("cenário de período longo com total baixo — soma exata, nenhum dia negativo ou acima do teto", () => {
    for (let i = 0; i < 300; i++) {
      const cronograma = gerarCronogramaDiario(1, utc(2026, 1, 1), utc(2026, 3, 6)); // 65 dias
      const soma = cronograma.reduce((acc, d) => acc + d.percentual, 0);
      expect(soma).toBeCloseTo(1, 2);
      for (const dia of cronograma) {
        expect(dia.percentual).toBeGreaterThanOrEqual(0);
        expect(dia.percentual).toBeLessThanOrEqual(LIMITE_MAXIMO_DIARIO);
      }
    }
  });

  it("nenhum dia passa de 0,45% mesmo com o total no limite exato do que é possível", () => {
    for (let i = 0; i < 100; i++) {
      const dias = 5 + Math.floor(Math.random() * 30);
      const inicio = utc(2026, 1, 1);
      const fim = new Date(inicio);
      fim.setUTCDate(fim.getUTCDate() + dias - 1);
      const total = dias * LIMITE_MAXIMO_DIARIO; // o máximo absoluto possível

      const cronograma = gerarCronogramaDiario(total, inicio, fim);
      const soma = cronograma.reduce((acc, d) => acc + d.percentual, 0);
      expect(soma).toBeCloseTo(total, 2);
      for (const dia of cronograma) {
        expect(dia.percentual).toBeLessThanOrEqual(LIMITE_MAXIMO_DIARIO);
      }
      // Nesse limite exato, só sobra um jeito de bater o total: todo dia no teto.
      for (const dia of cronograma) {
        expect(dia.percentual).toBeCloseTo(LIMITE_MAXIMO_DIARIO, 2);
      }
    }
  });

  it("nunca repete o mesmo percentual em dois dias seguidos", () => {
    for (let i = 0; i < 100; i++) {
      const cronograma = gerarCronogramaDiario(6, utc(2026, 1, 1), utc(2026, 1, 30)); // 30 dias
      for (let d = 1; d < cronograma.length; d++) {
        expect(cronograma[d].percentual).not.toBe(cronograma[d - 1].percentual);
      }
    }
  });

  it("o primeiro dia normalmente não repete um valorDiaAnterior informado (fronteira com dia já processado)", () => {
    // Melhor esforço, não garantia absoluta (prioriza sempre soma exata e teto por dia) — mas
    // deve resolver na grande maioria dos casos.
    let acertos = 0;
    const tentativas = 50;
    for (let i = 0; i < tentativas; i++) {
      const cronograma = gerarCronogramaDiario(3, utc(2026, 1, 1), utc(2026, 1, 20), 0.13);
      if (cronograma[0].percentual !== 0.13) acertos++;
    }
    expect(acertos).toBeGreaterThanOrEqual(tentativas * 0.9);
  });

  it("em média, sexta rende bem mais que um dia comum e que o fim de semana (verificação estatística da prioridade, sem estourar o teto)", () => {
    // Total escolhido pra escalar sem encostar no teto de 0,45% (evita achatar a diferença).
    const cronograma = gerarCronogramaDiario(120, utc(2024, 1, 1), utc(2025, 12, 31));
    const semUltimo = cronograma.slice(0, -1);

    const media = (dias: typeof semUltimo) => dias.reduce((acc, d) => acc + d.percentual, 0) / dias.length;

    const mediaSexta = media(semUltimo.filter((d) => d.data.getUTCDay() === 5));
    const mediaUtil = media(semUltimo.filter((d) => d.data.getUTCDay() >= 1 && d.data.getUTCDay() <= 4));
    const mediaFds = media(semUltimo.filter((d) => d.data.getUTCDay() === 0 || d.data.getUTCDay() === 6));

    expect(mediaSexta).toBeGreaterThan(mediaUtil);
    expect(mediaUtil).toBeGreaterThan(mediaFds);
  });

  it("período de um único dia nunca passa do teto, mesmo pedindo mais que isso", () => {
    const cronograma = gerarCronogramaDiario(3.5, utc(2026, 4, 10), utc(2026, 4, 10));
    expect(cronograma).toHaveLength(1);
    expect(cronograma[0].percentual).toBe(LIMITE_MAXIMO_DIARIO);
  });

  it("período de um único dia dentro do teto recebe o percentual total inteiro", () => {
    const cronograma = gerarCronogramaDiario(0.3, utc(2026, 4, 10), utc(2026, 4, 10));
    expect(cronograma).toHaveLength(1);
    expect(cronograma[0].percentual).toBeCloseTo(0.3, 2);
  });

  it("cobre corretamente um período que atravessa a virada do mês", () => {
    const cronograma = gerarCronogramaDiario(1, utc(2026, 1, 30), utc(2026, 2, 2));
    expect(cronograma.map((d) => d.data.toISOString().slice(0, 10))).toEqual([
      "2026-01-30",
      "2026-01-31",
      "2026-02-01",
      "2026-02-02",
    ]);
  });
});
