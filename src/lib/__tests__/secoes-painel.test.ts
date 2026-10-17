import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  SECOES_PAINEL,
  SECOES_PAINEL_PADRAO,
  ehCampoSecaoPainel,
  secoesDaConfiguracao,
} from "@/lib/secoes-painel";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// Nunca toca na configuração real (compartilhada com produção): o prisma é substituído por um espião.
const upsert = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({
  prisma: { configuracaoSistema: { upsert }, logAuditoria: { create: vi.fn() } },
}));

describe("secoes-painel (helpers)", () => {
  it("padrão: tudo visível", () => {
    expect(Object.values(SECOES_PAINEL_PADRAO).every(Boolean)).toBe(true);
    expect(SECOES_PAINEL).toHaveLength(5);
  });

  it("só aceita os campos conhecidos", () => {
    expect(ehCampoSecaoPainel("mostrarPerfilOperacao")).toBe(true);
    expect(ehCampoSecaoPainel("modoSaqueCapital")).toBe(false);
    expect(ehCampoSecaoPainel("")).toBe(false);
  });

  it("mapeia cada coluna da configuração pra sua chave", () => {
    const r = secoesDaConfiguracao({
      mostrarEstrategia: false,
      mostrarComparativo: true,
      mostrarPerfilOperacao: false,
      mostrarEvolucaoRendimentos: true,
      mostrarRentabilidadeIndices: false,
    });
    expect(r).toEqual({
      estrategia: false,
      comparativo: true,
      perfilOperacao: false,
      evolucaoRendimentos: true,
      rentabilidadeIndices: false,
    });
  });
});

describe("definirSecaoPainelAction", () => {
  beforeEach(() => upsert.mockClear());

  it("recusa quem não é admin, sem gravar nada", async () => {
    const { auth } = await import("@/auth");
    // @ts-expect-error — mock simplificado
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1", perfil: "USUARIO" } });
    const { definirSecaoPainelAction } = await import("@/app/restrito/estrategia/actions");
    await expect(definirSecaoPainelAction("mostrarPerfilOperacao", false)).rejects.toThrow(/negado/i);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("recusa campo que não é um bloco do painel (não deixa mexer em outras configurações)", async () => {
    const { auth } = await import("@/auth");
    // @ts-expect-error — mock simplificado
    vi.mocked(auth).mockResolvedValue({ user: { id: "a1", perfil: "ADMIN" } });
    const { definirSecaoPainelAction } = await import("@/app/restrito/estrategia/actions");
    const r = await definirSecaoPainelAction("modoSaqueCapital", true);
    expect(r.error).toBeDefined();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("admin + campo válido: grava só aquele campo", async () => {
    const { auth } = await import("@/auth");
    // @ts-expect-error — mock simplificado
    vi.mocked(auth).mockResolvedValue({ user: { id: "a1", perfil: "ADMIN" } });
    const { definirSecaoPainelAction } = await import("@/app/restrito/estrategia/actions");
    const r = await definirSecaoPainelAction("mostrarPerfilOperacao", false);
    expect(r.error).toBeUndefined();
    expect(upsert).toHaveBeenCalledWith({
      where: { id: "default" },
      create: { id: "default", mostrarPerfilOperacao: false },
      update: { mostrarPerfilOperacao: false },
    });
  });
});
