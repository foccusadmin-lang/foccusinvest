import "dotenv/config";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { contratarServicos } from "@/lib/servicos-contratacao";
import {
  executarSaqueEmergenciaCarencia,
  liberarSaquesEmergenciaCarenciaVencidos,
} from "@/lib/emergencia";
import { CARTEIRA_DESTINO_CODIGO } from "@/lib/servicos";
import { EMAIL_ADMINISTRADORA } from "@/lib/taxa-saque-carencia";
import { adicionarDiasUteis } from "@/lib/datas";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// Modo de saque simulado por mock — nunca altera a configuração real (compartilhada com produção).
const modo = vi.hoisted(() => ({ atual: "MANUAL" as "MANUAL" | "AUTOMATICO" }));
vi.mock("@/lib/configuracao", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/configuracao")>();
  return {
    ...original,
    getConfiguracao: async () => ({ ...(await original.getConfiguracao()), modoSaqueCapital: modo.atual }),
  };
});

describe("adicionarDiasUteis", () => {
  it("pula sábado e domingo", () => {
    // Sexta 2026-09-18 + 1 dia útil = segunda 2026-09-21
    const sexta = new Date("2026-09-18T15:00:00Z");
    expect(adicionarDiasUteis(1, sexta).toISOString().slice(0, 10)).toBe("2026-09-21");
    expect(adicionarDiasUteis(5, sexta).toISOString().slice(0, 10)).toBe("2026-09-25");
    expect(adicionarDiasUteis(15, sexta).toISOString().slice(0, 10)).toBe("2026-10-09");
  });
});

describe("Saque de emergência self-service (capital em carência)", () => {
  let userId: string;
  let empresaUserId: string;
  let inicioDoTeste: Date;
  let nomeInvestidor: string;

  beforeEach(async () => {
    const stamp = `${Date.now()}.${Math.random().toString(36).slice(2)}`;
    inicioDoTeste = new Date();
    nomeInvestidor = `Teste Emergência ${stamp}`;

    const empresa = await prisma.user.findUniqueOrThrow({
      where: { codigoIndicacao: CARTEIRA_DESTINO_CODIGO },
      select: { id: true },
    });
    empresaUserId = empresa.id;

    const user = await prisma.user.create({
      data: { email: `teste.emergencia.${stamp}@example.com`, name: nomeInvestidor, perfil: "USUARIO", statusCadastro: "APROVADO" },
    });
    userId = user.id;

    await prisma.creditoCarteira.create({ data: { userId, tipo: "RENDIMENTO", valor: 20, moeda: "BRL", origem: "Teste" } });
    await prisma.aplicacao.create({
      data: { userId, valor: 1000, moeda: "BRL", status: "CONFIRMADA", liberaEm: new Date(Date.now() + 60 * 86400000) },
    });

    modo.atual = "MANUAL";
  });

  afterEach(async () => {
    const administradora = await prisma.user.findFirst({ where: { email: EMAIL_ADMINISTRADORA } });
    if (administradora) {
      await prisma.creditoCarteira.deleteMany({
        where: { userId: administradora.id, origem: `Taxa de saque de carência — ${nomeInvestidor}` },
      });
    }
    const saques = await prisma.solicitacaoSaque.findMany({ where: { userId }, select: { id: true } });
    const ids = saques.map((s) => s.id);
    await prisma.aplicacao.deleteMany({ where: { solicitacaoSaqueId: { in: ids } } });
    await prisma.solicitacaoSaque.deleteMany({ where: { id: { in: ids } } });
    await prisma.cobrancaServico.deleteMany({ where: { userId } });
    await prisma.contratoServico.deleteMany({ where: { userId } });
    await prisma.aplicacao.deleteMany({ where: { userId } });
    await prisma.aplicacao.deleteMany({
      where: { userId: empresaUserId, origem: "PAGAMENTO_SERVICO", criadoEm: { gte: inicioDoTeste } },
    });
    await prisma.creditoCarteira.deleteMany({ where: { userId } });
    await prisma.logAuditoria.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  const pedido = (valorBruto: number) => ({
    userId,
    valorBruto,
    chavePixTexto: "teste@example.com",
    chavePixTipo: "EMAIL",
    idempotencyKey: null,
  });

  it("recusa sem o serviço contratado", async () => {
    const r = await executarSaqueEmergenciaCarencia(pedido(300));
    expect(r.error).toMatch(/Saque de emergência/);
    expect(await prisma.solicitacaoSaque.count({ where: { userId } })).toBe(0);
  });

  it("com o serviço ativo: debita o bruto, paga 85%, credita a taxa e agenda 15 dias úteis", async () => {
    await contratarServicos(userId, ["SAQUE_EMERGENCIA"], "INDIVIDUAL", crypto.randomUUID());

    const r = await executarSaqueEmergenciaCarencia(pedido(300));
    expect(r.error).toBeUndefined();

    const saque = await prisma.solicitacaoSaque.findFirstOrThrow({ where: { userId } });
    expect(saque.status).toBe("SOLICITADO");
    expect(saque.emergencial).toBe(true);
    expect(saque.valorBruto).toBeCloseTo(300, 2);
    expect(saque.taxaAntecipacao).toBeCloseTo(45, 2);
    expect(saque.valor).toBeCloseTo(255, 2);
    expect(saque.liberacaoAutomaticaEm).not.toBeNull();
    expect(saque.liberacaoAutomaticaEm!.getTime()).toBeGreaterThan(Date.now() + 14 * 86400000);

    const reservados = await prisma.aplicacao.findMany({ where: { solicitacaoSaqueId: saque.id } });
    expect(reservados.reduce((a, l) => a + l.valor, 0)).toBeCloseTo(300, 2);

    const administradora = await prisma.user.findFirstOrThrow({ where: { email: EMAIL_ADMINISTRADORA } });
    const taxa = await prisma.creditoCarteira.findFirst({
      where: { userId: administradora.id, origem: `Taxa de saque de carência — ${nomeInvestidor}` },
    });
    expect(taxa?.valor).toBeCloseTo(45, 2);
  });

  it("recusa valor maior que o capital em carência", async () => {
    await contratarServicos(userId, ["SAQUE_EMERGENCIA"], "INDIVIDUAL", crypto.randomUUID());
    const r = await executarSaqueEmergenciaCarencia(pedido(1500));
    expect(r.error).toMatch(/carência/);
  });

  async function criarSaqueVencido() {
    await contratarServicos(userId, ["SAQUE_EMERGENCIA"], "INDIVIDUAL", crypto.randomUUID());
    await executarSaqueEmergenciaCarencia(pedido(300));
    const saque = await prisma.solicitacaoSaque.findFirstOrThrow({ where: { userId } });
    await prisma.solicitacaoSaque.update({ where: { id: saque.id }, data: { liberacaoAutomaticaEm: new Date(Date.now() - 1000) } });
    return saque.id;
  }

  it("modo automático: libera sozinho o saque vencido (AGUARDANDO_PAGAMENTO, lotes RETIRADA), nunca PAGO", async () => {
    const id = await criarSaqueVencido();
    modo.atual = "AUTOMATICO";

    await liberarSaquesEmergenciaCarenciaVencidos();

    const saque = await prisma.solicitacaoSaque.findUniqueOrThrow({ where: { id } });
    expect(saque.status).toBe("AGUARDANDO_PAGAMENTO");
    const lotes = await prisma.aplicacao.findMany({ where: { solicitacaoSaqueId: id } });
    expect(lotes.every((l) => l.status === "RETIRADA")).toBe(true);
  });

  it("modo manual: não libera nada sozinho mesmo vencido", async () => {
    const id = await criarSaqueVencido();
    modo.atual = "MANUAL";

    await liberarSaquesEmergenciaCarenciaVencidos();

    const saque = await prisma.solicitacaoSaque.findUniqueOrThrow({ where: { id } });
    expect(saque.status).toBe("SOLICITADO");
  });

  it("modo automático: não libera antes do prazo", async () => {
    await contratarServicos(userId, ["SAQUE_EMERGENCIA"], "INDIVIDUAL", crypto.randomUUID());
    await executarSaqueEmergenciaCarencia(pedido(300));
    modo.atual = "AUTOMATICO";

    await liberarSaquesEmergenciaCarenciaVencidos();

    const saque = await prisma.solicitacaoSaque.findFirstOrThrow({ where: { userId } });
    expect(saque.status).toBe("SOLICITADO");
  });
});
