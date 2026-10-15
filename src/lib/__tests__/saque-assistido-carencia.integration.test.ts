import "dotenv/config";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";

/**
 * Testes de integração pra "Capital em carência (taxa de 15%)" no saque assistido do admin
 * (restrito/usuarios/ajuste-actions.ts) — mesmo padrão de saque-pix.integration.test.ts: rodam
 * contra o banco de desenvolvimento real, sempre com contas descartáveis (`teste.*@example.com`).
 *
 * A regra: o admin digita o valor que o cliente precisa RECEBER (ex: R$300) e a taxa de 15% é somada em cima (R$45) — saem R$345 do capital e o Pix é de R$300. Antes (regra antiga): o valor digitado era descontado integralmente do
 * capital do investidor, mas o Pix gerado (o que o cliente recebe de fato) já sai com 15% de
 * taxa de antecipação descontada (R$300 → paga R$255, taxa de R$45).
 */

vi.mock("@/auth", () => ({ auth: vi.fn() }));
// ajustarSaldoUsuario chama revalidatePath no final do caminho de sucesso — fora de uma
// requisição Next.js de verdade (rodando aqui via vitest) isso lança "static generation store
// missing". Mocka como no-op, só pra exercitar a lógica de negócio em si.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// A taxa retida é creditada de verdade na conta REAL da Foccus Administradora (é o próprio
// propósito do recurso — virar fundo de caixa do sistema) — não dá pra mockar sem deixar de
// testar o comportamento real. Em vez disso, o nome do investidor de teste entra no `origem` do
// crédito de taxa (ver ajuste-actions.ts), tornando-o unicamente identificável pra limpar
// exatamente esse crédito no afterEach, sem tocar em mais nada da conta real.
const EMAIL_ADMINISTRADORA = "foccusadmin@gmail.com";

describe("Saque assistido — Capital em carência (taxa de 15%)", () => {
  let adminId: string;
  let investidorId: string;
  let investidorNome: string;
  let saqueIds: string[];

  beforeEach(async () => {
    const stamp = `${Date.now()}.${Math.random().toString(36).slice(2)}`;
    const admin = await prisma.user.create({
      data: { email: `teste.carencia.admin.${stamp}@example.com`, name: "Admin", perfil: "ADMIN", statusCadastro: "APROVADO" },
    });
    adminId = admin.id;

    investidorNome = `Teste Carência ${stamp}`;
    const investidor = await prisma.user.create({
      data: { email: `teste.carencia.investidor.${stamp}@example.com`, name: investidorNome, perfil: "USUARIO", statusCadastro: "APROVADO" },
    });
    investidorId = investidor.id;

    // Capital ainda em carência (liberaEm no futuro) — exatamente o cenário que a opção existe
    // pra cobrir: sacar antes do prazo, com a taxa de antecipação.
    await prisma.aplicacao.create({
      data: {
        userId: investidorId,
        valor: 1000,
        moeda: "BRL",
        status: "CONFIRMADA",
        liberaEm: new Date(Date.now() + 60 * 86400000),
      },
    });

    saqueIds = [];
  });

  afterEach(async () => {
    // Remove só o(s) crédito(s) de taxa que ESTE teste gerou na conta real da Foccus
    // Administradora — o `origem` inclui o nome único do investidor de teste, então não há
    // risco de apagar nenhum crédito real de taxa de outro saque.
    const administradora = await prisma.user.findFirst({ where: { email: EMAIL_ADMINISTRADORA } });
    if (administradora) {
      await prisma.creditoCarteira.deleteMany({
        where: { userId: administradora.id, origem: `Taxa de saque de carência — ${investidorNome}` },
      });
    }
    await prisma.aplicacao.deleteMany({ where: { solicitacaoSaqueId: { in: saqueIds } } });
    await prisma.solicitacaoSaque.deleteMany({ where: { id: { in: saqueIds } } });
    await prisma.aplicacao.deleteMany({ where: { userId: investidorId } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, investidorId] } } });
  });

  async function saqueCarencia(valor: string) {
    const { auth } = await import("@/auth");
    const { ajustarSaldoUsuario } = await import("@/app/restrito/usuarios/ajuste-actions");

    // @ts-expect-error — mock simplificado, só o suficiente pro `session?.user?.perfil` ler.
    vi.mocked(auth).mockResolvedValue({ user: { id: adminId, perfil: "ADMIN" } });

    const formData = new FormData();
    formData.set("userId", investidorId);
    formData.set("operacao", "SAQUE");
    formData.append("tipos", "CAPITAL_CARENCIA");
    formData.set("valor_CAPITAL_CARENCIA", valor);
    formData.set("chavePix", "teste@example.com");
    formData.set("chavePixTipo", "EMAIL");

    return ajustarSaldoUsuario(undefined, formData);
  }

  it("soma 15% de taxa em cima do valor digitado: desconta valor + taxa do capital e gera o Pix só do valor", async () => {
    // Prazo maior que o padrão: gera QR Code de verdade (imagem PNG) além dos round-trips no
    // banco, e essa combinação passou do timeout padrão de 5s em execução real.
    const resultado = await saqueCarencia("300,00");
    expect(resultado?.error).toBeUndefined();
    expect(resultado?.sucesso).toBeDefined();

    const saque = await prisma.solicitacaoSaque.findFirstOrThrow({ where: { userId: investidorId } });
    saqueIds.push(saque.id);

    expect(saque.tipo).toBe("CAPITAL"); // grava como CAPITAL — a distinção fica em valorBruto/taxaAntecipacao
    // O admin digitou 300 (o que o cliente precisa receber): taxa = 15% de 300 = 45, bruto = 345.
    expect(saque.valorBruto).toBeCloseTo(345, 2);
    expect(saque.taxaAntecipacao).toBeCloseTo(45, 2);
    expect(saque.valor).toBeCloseTo(300, 2); // o que de fato é pago via Pix

    // O capital do investidor foi reduzido em valor + taxa (345), não só nos 300 pagos.
    const aplicacoes = await prisma.aplicacao.findMany({ where: { userId: investidorId } });
    const livre = aplicacoes.filter((a) => a.status === "CONFIRMADA").reduce((acc, a) => acc + a.valor, 0);
    const reservado = aplicacoes.filter((a) => a.status === "SAQUE_SOLICITADO").reduce((acc, a) => acc + a.valor, 0);
    expect(livre).toBeCloseTo(655, 2); // 1000 - 345
    expect(reservado).toBeCloseTo(345, 2);

    // Os 15% retidos (R$45) foram creditados como fundo de caixa na conta real da Foccus
    // Administradora.
    const administradora = await prisma.user.findFirstOrThrow({ where: { email: EMAIL_ADMINISTRADORA } });
    const creditoTaxa = await prisma.creditoCarteira.findFirstOrThrow({
      where: { userId: administradora.id, origem: `Taxa de saque de carência — ${investidorNome}` },
    });
    expect(creditoTaxa.tipo).toBe("RENDIMENTO");
    expect(creditoTaxa.valor).toBeCloseTo(45, 2);
  }, 20000);

  it("recusa quando valor + taxa passa do capital disponível (mesmo com o valor digitado cabendo)", async () => {
    // 900 cabe nos 1000 de capital, mas 900 + 15% (135) = 1035 não — quem precisa caber no saldo é
    // o bruto (valor + taxa), não só o valor digitado.
    const resultado = await saqueCarencia("900,00");
    expect(resultado?.error).toBeDefined();
    expect(resultado?.error).toMatch(/capital insuficiente/i);

    const total = await prisma.solicitacaoSaque.count({ where: { userId: investidorId } });
    expect(total).toBe(0); // nada foi criado
  });
});
