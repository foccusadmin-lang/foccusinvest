import { describe, it, expect } from "vitest";
import { janelaSaqueAberta } from "@/lib/janela-saque";

/** Constrói um instante UTC que corresponde a um horário exato de Brasília (UTC-3, sem horário
 *  de verão) num dia de semana conhecido. `diaBase` é uma sexta-feira de referência (2026-01-02). */
function sextaBrasilia(hora: number, minuto: number): Date {
  return new Date(Date.UTC(2026, 0, 2, hora + 3, minuto)); // 2026-01-02 é sexta-feira
}

function outroDiaBrasilia(diaMes: number, hora: number, minuto: number): Date {
  // Janeiro/2026: dia 1 é quinta, dia 3 é sábado, dia 4 é domingo.
  return new Date(Date.UTC(2026, 0, diaMes, hora + 3, minuto));
}

describe("janelaSaqueAberta", () => {
  it("aberta exatamente às 07h00 de sexta (início da janela, inclusive)", () => {
    expect(janelaSaqueAberta(sextaBrasilia(7, 0))).toBe(true);
  });

  it("fechada às 06h59 de sexta (um minuto antes de abrir)", () => {
    expect(janelaSaqueAberta(sextaBrasilia(6, 59))).toBe(false);
  });

  it("aberta exatamente às 18h30 de sexta (fim da janela, inclusive)", () => {
    expect(janelaSaqueAberta(sextaBrasilia(18, 30))).toBe(true);
  });

  it("fechada às 18h31 de sexta (um minuto depois de fechar)", () => {
    expect(janelaSaqueAberta(sextaBrasilia(18, 31))).toBe(false);
  });

  it("aberta no meio da janela (sexta ao meio-dia)", () => {
    expect(janelaSaqueAberta(sextaBrasilia(12, 0))).toBe(true);
  });

  it("fechada em qualquer outro dia da semana, mesmo dentro do horário", () => {
    expect(janelaSaqueAberta(outroDiaBrasilia(1, 12, 0))).toBe(false); // quinta
    expect(janelaSaqueAberta(outroDiaBrasilia(3, 12, 0))).toBe(false); // sábado
    expect(janelaSaqueAberta(outroDiaBrasilia(4, 12, 0))).toBe(false); // domingo
  });
});
