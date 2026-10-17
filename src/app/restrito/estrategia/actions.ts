"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ehCampoSecaoPainel } from "@/lib/secoes-painel";

export type EstrategiaState = { error?: string; sucesso?: string } | undefined;

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") throw new Error("Acesso negado.");
  return session.user;
}

function parsePercentual(raw: FormDataEntryValue | null): number {
  const texto = String(raw ?? "").trim().replace(",", ".");
  return Number(texto);
}

/** Cria (se não existir nenhuma ainda) ou atualiza a estratégia de operação — nome, moedas
 *  trabalhadas, faixa esperada de resultado, e se está "ao vivo" (visível no painel). */
export async function salvarEstrategiaAction(
  _prevState: EstrategiaState,
  formData: FormData
): Promise<EstrategiaState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const moedas = String(formData.get("moedas") ?? "").trim();
  const esperadoMin = parsePercentual(formData.get("esperadoMin"));
  const esperadoMax = parsePercentual(formData.get("esperadoMax"));
  const ativa = formData.get("ativa") === "1";

  if (!nome) return { error: "Informe o nome da estratégia." };
  if (!moedas) return { error: "Informe as moedas trabalhadas." };
  if (Number.isNaN(esperadoMin) || Number.isNaN(esperadoMax)) {
    return { error: "Informe uma faixa esperada válida." };
  }
  if (esperadoMin > esperadoMax) {
    return { error: "O mínimo esperado não pode ser maior que o máximo." };
  }

  const dados = { nome, moedas, esperadoMin, esperadoMax, ativa };

  if (id) {
    await prisma.estrategiaOperacao.update({ where: { id }, data: dados });
  } else {
    await prisma.estrategiaOperacao.create({ data: dados });
  }

  revalidatePath("/restrito/estrategia");
  revalidatePath("/painel");
  return { sucesso: "Estratégia salva." };
}

/** Lança (ou substitui, se já existir um lançamento nesse dia) a variação percentual de um dia
 *  específico — cada ponto entra na soma acumulada e no gráfico Comparativo da vitrine. */
export async function adicionarPontoAction(
  _prevState: EstrategiaState,
  formData: FormData
): Promise<EstrategiaState> {
  await requireAdmin();

  const estrategiaId = String(formData.get("estrategiaId") ?? "").trim();
  const dataTexto = String(formData.get("data") ?? "").trim();
  const variacaoDia = parsePercentual(formData.get("variacaoDia"));

  if (!estrategiaId) return { error: "Estratégia não encontrada." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataTexto)) return { error: "Escolha uma data válida." };
  if (Number.isNaN(variacaoDia)) return { error: "Informe uma variação válida (ex: 0,20 ou -0,15)." };

  const data = new Date(`${dataTexto}T12:00:00-03:00`);

  await prisma.pontoEstrategia.upsert({
    where: { estrategiaId_data: { estrategiaId, data } },
    create: { estrategiaId, data, variacaoDia },
    update: { variacaoDia },
  });

  revalidatePath("/restrito/estrategia");
  revalidatePath("/painel");
  return { sucesso: `Variação de ${dataTexto} lançada.` };
}

export async function excluirPontoAction(pontoId: string): Promise<void> {
  await requireAdmin();
  await prisma.pontoEstrategia.delete({ where: { id: pontoId } });
  revalidatePath("/restrito/estrategia");
  revalidatePath("/painel");
}

/** Liga/desliga um bloco do dashboard do investidor (Estratégia, Comparativo, Perfil de operação,
 *  Evolução dos rendimentos, Rentabilidade versus índices). Vale pra todos os investidores, na
 *  hora: desligado, o bloco some do painel; ligado, volta a aparecer. */
export async function definirSecaoPainelAction(
  campo: string,
  ativo: boolean
): Promise<{ error?: string }> {
  const admin = await requireAdmin();

  if (!ehCampoSecaoPainel(campo)) return { error: "Bloco inválido." };

  await prisma.configuracaoSistema.upsert({
    where: { id: "default" },
    create: { id: "default", [campo]: ativo },
    update: { [campo]: ativo },
  });
  await prisma.logAuditoria.create({
    data: { userId: admin.id, acao: "painel_secao_visibilidade", detalhes: `${campo}=${ativo}` },
  });

  revalidatePath("/restrito/estrategia");
  revalidatePath("/painel");
  return {};
}
