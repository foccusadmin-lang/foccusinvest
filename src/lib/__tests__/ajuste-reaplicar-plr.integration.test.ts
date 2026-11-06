import "dotenv/config";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";

/**
 * "Ajuste de saldo" → "Reaplicar": o admin reaplica o PLR disponível de um investidor, sem o valor
 * mínimo de R$ 100,00 (pode ser R$ 0,01). Só consome PLR — nunca o incentivo de liderança nem o
 * bônus. Roda contra o banco de desenvolvimento com contas descartáveis (`teste.*@example.com`).
 */
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe("Ajuste de saldo — Reaplicar PLR (admin)", () => {
  let adminId: string;
  let investidorId: string;

  beforeEach(async () => {
    const stamp = `${Date.now()}.${Math.random().toString(36).slice(2)}`;
    const admin = await prisma.user.create({
      data: { email: `teste.reaplicaradm.admin.${stamp}@example.com`, name: "Admin", perfil: "ADMIN", statusCadastro: "APROVADO" },
    });
    adminId = admin.id;
    const inv = await prisma.user.create({
      data: { email: `teste.reaplicaradm.inv.${stamp}@example.com`, name: "Investidor Teste", perfil: "LIDER", statusCadastro: "APROVADO" },
    });
    investidorId = inv.id;

    await prisma.creditoCarteira.createMany({
      data: [
        { userId: investidorId, tipo: "RENDIMENTO", valor: 0.5, moeda: "BRL", origem: "PLR manual 0.1% (admin)" },
        { userId: investidorId, tipo: "RENDIMENTO", valor: 5, moeda: "BRL", origem: "Incentivo de liderança 0.1% (automático)" },
        { userId: investidorId, tipo: "BONUS", valor: 7, moeda: "BRL", origem: "Bônus de indicação" },
      ],
    });
  });

  afterEach(async () => {
    await prisma.logAuditoria.deleteMany({ where: { userId: adminId } });
    await prisma.creditoCarteira.deleteMany({ where: { userId: investidorId } });
    await prisma.aplicacao.deleteMany({ where: { userId: investidorId } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, investidorId] } } });
  });

  async function reaplicar(valor: string, tipos: string[] = ["RENDIMENTO"], operacao = "REAPLICAR") {
    const { auth } = await import("@/auth");
    const { ajustarSaldoUsuario } = await import("@/app/restrito/usuarios/ajuste-actions");
    // @ts-expect-error — mock simplificado, só o suficiente pro `session?.user` ler.
    vi.mocked(auth).mockResolvedValue({ user: { id: adminId, perfil: "ADMIN" } });

    const formData = new FormData();
    formData.set("userId", investidorId);
    formData.set("operacao", operacao);
    for (const t of tipos) formData.append("tipos", t);
    formData.set("valor_RENDIMENTO", valor);
    return ajustarSaldoUsuario(undefined, formData);
  }

  it("reaplica R$ 0,01 (bem abaixo do mínimo de R$ 100,00) e cria o lote com carência de 90 dias", async () => {
    const r = await reaplicar("0,01");
    expect(r?.error).toBeUndefined();
    expect(r?.sucesso).toBeDefined();

    const lote = await prisma.aplicacao.findFirstOrThrow({ where: { userId: investidorId, origem: "REAPLICACAO" } });
    expect(lote.valor).toBeCloseTo(0.01, 2);
    expect(lote.status).toBe("CONFIRMADA");
    const dias = (lote.liberaEm.getTime() - Date.now()) / 86400000;
    expect(dias).toBeGreaterThan(89);
    expect(dias).toBeLessThan(91);

    const log = await prisma.logAuditoria.findFirst({ where: { userId: adminId, acao: "reaplicar_plr_admin" } });
    expect(log).not.toBeNull();
  });

  it("consome só o PLR: incentivo de liderança e bônus ficam intactos", async () => {
    const r = await reaplicar("0,50");
    expect(r?.error).toBeUndefined();

    const livres = await prisma.creditoCarteira.findMany({ where: { userId: investidorId, utilizadoEm: null } });
    const plr = livres.filter((c) => c.tipo === "RENDIMENTO" && !c.origem.startsWith("Incentivo"));
    const incentivo = livres.filter((c) => c.origem.startsWith("Incentivo"));
    const bonus = livres.filter((c) => c.tipo === "BONUS");
    expect(plr.reduce((a, c) => a + c.valor, 0)).toBeCloseTo(0, 2);
    expect(incentivo.reduce((a, c) => a + c.valor, 0)).toBeCloseTo(5, 2);
    expect(bonus.reduce((a, c) => a + c.valor, 0)).toBeCloseTo(7, 2);
  });

  it("recusa valor acima do PLR disponível (não puxa do incentivo nem do bônus) e não cria nada", async () => {
    const r = await reaplicar("1,00"); // só há R$ 0,50 de PLR; incentivo (5) e bônus (7) não valem
    expect(r?.error).toMatch(/insuficiente/i);
    expect(await prisma.aplicacao.count({ where: { userId: investidorId } })).toBe(0);
    const livres = await prisma.creditoCarteira.findMany({ where: { userId: investidorId, utilizadoEm: null } });
    expect(livres.reduce((a, c) => a + c.valor, 0)).toBeCloseTo(12.5, 2); // nada foi consumido
  });

  it("recusa tipo que não seja o PLR e valor zero", async () => {
    const outro = await reaplicar("0,10", ["BONUS"]);
    expect(outro?.error).toBeDefined();
    const zero = await reaplicar("0,00");
    expect(zero?.error).toBeDefined();
    expect(await prisma.aplicacao.count({ where: { userId: investidorId } })).toBe(0);
  });
});
