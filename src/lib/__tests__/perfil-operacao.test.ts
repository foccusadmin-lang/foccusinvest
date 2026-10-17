import { describe, it, expect } from "vitest";
import { classificarPerfil } from "@/lib/perfil-operacao";

describe("classificarPerfil", () => {
  it("os exemplos definidos pela Foccus", () => {
    expect(classificarPerfil(0.1).codigo).toBe("CONSERVADOR");
    expect(classificarPerfil(0.35).codigo).toBe("MODERADO");
    expect(classificarPerfil(0.65).codigo).toBe("AGRESSIVO");
    expect(classificarPerfil(0.9).codigo).toBe("SUPERAGRESSIVO");
  });

  it("limites: o teto de cada faixa pertence a ela, +0,01 já é a seguinte", () => {
    expect(classificarPerfil(0).codigo).toBe("CONSERVADOR");
    expect(classificarPerfil(0.25).codigo).toBe("CONSERVADOR");
    expect(classificarPerfil(0.26).codigo).toBe("MODERADO");
    expect(classificarPerfil(0.5).codigo).toBe("MODERADO");
    expect(classificarPerfil(0.51).codigo).toBe("AGRESSIVO");
    expect(classificarPerfil(0.75).codigo).toBe("AGRESSIVO");
    expect(classificarPerfil(0.76).codigo).toBe("SUPERAGRESSIVO");
    expect(classificarPerfil(1).codigo).toBe("SUPERAGRESSIVO");
  });

  it("não se perde com imprecisão de ponto flutuante", () => {
    expect(classificarPerfil(0.1 + 0.15).codigo).toBe("CONSERVADOR"); // 0,25000000000000006
    expect(classificarPerfil(0.7 + 0.05).codigo).toBe("AGRESSIVO"); // 0,75 (0.7+0.05 = 0.7499999999999999)
  });

  it("retorno negativo fica no Conservador e acima de 1% no Superagressivo", () => {
    expect(classificarPerfil(-0.3).codigo).toBe("CONSERVADOR");
    expect(classificarPerfil(1.4).codigo).toBe("SUPERAGRESSIVO");
  });
});
