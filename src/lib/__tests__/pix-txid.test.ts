import { describe, it, expect } from "vitest";
import { gerarTxid } from "@/lib/pix-txid";

describe("gerarTxid", () => {
  it("gera só letras e números, no máximo 25 caracteres", () => {
    for (let i = 0; i < 50; i++) {
      const txid = gerarTxid();
      expect(txid.length).toBeLessThanOrEqual(25);
      expect(txid).toMatch(/^[A-Z0-9]+$/);
    }
  });

  it("gera TXIDs únicos em chamadas sucessivas", () => {
    const gerados = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      gerados.add(gerarTxid());
    }
    expect(gerados.size).toBe(1000);
  });
});
