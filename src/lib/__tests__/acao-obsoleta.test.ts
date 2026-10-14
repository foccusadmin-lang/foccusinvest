import { describe, it, expect } from "vitest";
import { ehErroDeAcaoObsoleta } from "@/lib/acao-obsoleta";

describe("ehErroDeAcaoObsoleta", () => {
  it("reconhece a mensagem do Next e o nome do erro", () => {
    expect(
      ehErroDeAcaoObsoleta(new Error('Server Action "40f0556583e59c" was not found on the server.'))
    ).toBe(true);
    expect(ehErroDeAcaoObsoleta(new Error("Failed to find Server Action"))).toBe(true);
    const e = new Error("x");
    e.name = "UnrecognizedActionError";
    expect(ehErroDeAcaoObsoleta(e)).toBe(true);
  });

  it("não confunde com outros erros", () => {
    expect(ehErroDeAcaoObsoleta(new Error("Saldo insuficiente"))).toBe(false);
    expect(ehErroDeAcaoObsoleta(undefined)).toBe(false);
    expect(ehErroDeAcaoObsoleta(null)).toBe(false);
  });
});
