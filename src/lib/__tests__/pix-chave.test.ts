import { describe, it, expect } from "vitest";
import { normalizarChavePix } from "@/lib/pix-chave";

describe("normalizarChavePix — TELEFONE", () => {
  it("converte telefone sem DDI pro padrão internacional +55", () => {
    const r = normalizarChavePix("(11) 98529-9785", "TELEFONE");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.chaveNormalizada).toBe("+5511985299785");
  });

  it("aceita telefone já com DDI 55", () => {
    const r = normalizarChavePix("5511985299785", "TELEFONE");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.chaveNormalizada).toBe("+5511985299785");
  });

  it("aceita fixo (10 dígitos, sem o 9)", () => {
    const r = normalizarChavePix("(11) 3529-9785", "TELEFONE");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.chaveNormalizada).toBe("+551135299785");
  });

  it("rejeita telefone com quantidade errada de dígitos", () => {
    const r = normalizarChavePix("12345", "TELEFONE");
    expect(r.ok).toBe(false);
  });
});

describe("normalizarChavePix — CPF", () => {
  it("aceita CPF válido e normaliza só os 11 dígitos", () => {
    const r = normalizarChavePix("111.444.777-35", "CPF");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.chaveNormalizada).toBe("11144477735");
  });

  it("rejeita CPF com dígito verificador inválido", () => {
    const r = normalizarChavePix("111.444.777-36", "CPF");
    expect(r.ok).toBe(false);
  });

  it("rejeita CPF com todos os dígitos iguais", () => {
    const r = normalizarChavePix("111.111.111-11", "CPF");
    expect(r.ok).toBe(false);
  });
});

describe("normalizarChavePix — CNPJ", () => {
  it("aceita CNPJ válido e normaliza só os 14 dígitos", () => {
    const r = normalizarChavePix("11.222.333/0001-81", "CNPJ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.chaveNormalizada).toBe("11222333000181");
  });

  it("rejeita CNPJ com dígito verificador inválido", () => {
    const r = normalizarChavePix("11.222.333/0001-82", "CNPJ");
    expect(r.ok).toBe(false);
  });
});

describe("normalizarChavePix — EMAIL", () => {
  it("aceita e-mail válido e converte pra minúsculas", () => {
    const r = normalizarChavePix("Investidor@Exemplo.COM", "EMAIL");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.chaveNormalizada).toBe("investidor@exemplo.com");
  });

  it("rejeita e-mail sem @ ou sem domínio", () => {
    expect(normalizarChavePix("nao-eh-email", "EMAIL").ok).toBe(false);
    expect(normalizarChavePix("sem-dominio@", "EMAIL").ok).toBe(false);
  });
});

describe("normalizarChavePix — ALEATORIA", () => {
  it("aceita chave no formato UUID", () => {
    const r = normalizarChavePix("123e4567-e89b-12d3-a456-426614174000", "ALEATORIA");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.chaveNormalizada).toBe("123e4567-e89b-12d3-a456-426614174000");
  });

  it("rejeita chave aleatória fora do formato UUID", () => {
    expect(normalizarChavePix("nao-eh-uuid", "ALEATORIA").ok).toBe(false);
    expect(normalizarChavePix("123e4567e89b12d3a456426614174000", "ALEATORIA").ok).toBe(false);
  });
});

describe("normalizarChavePix — ambiguidade/campo vazio", () => {
  it("rejeita chave vazia em qualquer tipo", () => {
    expect(normalizarChavePix("", "CPF").ok).toBe(false);
    expect(normalizarChavePix("   ", "EMAIL").ok).toBe(false);
  });

  it("não aceita um CPF quando o tipo escolhido é EMAIL (nunca adivinha o tipo)", () => {
    const r = normalizarChavePix("11144477735", "EMAIL");
    expect(r.ok).toBe(false);
  });
});
