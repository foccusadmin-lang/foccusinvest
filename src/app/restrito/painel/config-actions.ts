"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import type { ModoProcessamento } from "@prisma/client";
import { atualizarModoSaque } from "@/lib/configuracao";
import { prisma } from "@/lib/prisma";

export async function definirModoSaque(
  campo:
    | "modoSaqueCapital"
    | "modoSaqueRendimento"
    | "modoVerificacaoCadastro"
    | "modoIncentivoLideranca"
    | "modoBonusIndicacao"
    | "modoAprovacaoAporte"
    | "modoPLR",
  modo: ModoProcessamento
) {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") throw new Error("Acesso negado.");

  await atualizarModoSaque(campo, modo);
  await prisma.logAuditoria.create({
    data: { userId: session.user.id, acao: "definir_modo_saque", detalhes: `${campo}=${modo}` },
  });

  revalidatePath("/restrito/painel");
}

export type LimiteAporteState = { error?: string; sucesso?: string } | undefined;

/** Teto de valor pra um aporte via Pix se qualificar pra aprovação automática — acima disso,
 *  mesmo com o modo Automático ligado, cai pra conferência manual (ver criarAplicacao, em
 *  painel/actions.ts). */
export async function definirValorMaximoAprovacaoAutomatica(
  _prevState: LimiteAporteState,
  formData: FormData
): Promise<LimiteAporteState> {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") return { error: "Acesso negado." };

  const texto = String(formData.get("valorMaximo") ?? "").trim().replace(/\./g, "").replace(",", ".");
  const valor = Number(texto);
  if (!valor || valor <= 0 || Number.isNaN(valor)) {
    return { error: "Informe um valor válido." };
  }

  await prisma.configuracaoSistema.upsert({
    where: { id: "default" },
    create: { id: "default", valorMaximoAprovacaoAutomatica: valor },
    update: { valorMaximoAprovacaoAutomatica: valor },
  });

  await prisma.logAuditoria.create({
    data: {
      userId: session.user.id,
      acao: "definir_valor_maximo_aprovacao_automatica",
      detalhes: String(valor),
    },
  });

  revalidatePath("/restrito/painel");
  revalidatePath("/restrito/configuracoes");
  return { sucesso: "Limite atualizado." };
}

/** Liga/desliga o botão de Aplicação em bens (imóvel/automóvel/eletrônico) pro investidor —
 *  não mexe em aportes em bens já em andamento, só bloqueia novas solicitações enquanto
 *  desativado (ver AcoesRapidas, no painel do investidor). */
export async function definirAplicacaoBensAtiva(ativa: boolean) {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") throw new Error("Acesso negado.");

  await prisma.configuracaoSistema.upsert({
    where: { id: "default" },
    create: { id: "default", aplicacaoBensAtiva: ativa },
    update: { aplicacaoBensAtiva: ativa },
  });

  await prisma.logAuditoria.create({
    data: {
      userId: session.user.id,
      acao: "definir_aplicacao_bens_ativa",
      detalhes: String(ativa),
    },
  });

  revalidatePath("/restrito/painel");
  revalidatePath("/restrito/configuracoes");
  revalidatePath("/painel");
}

export type ConfigPixSaqueState = { error?: string; sucesso?: string } | undefined;

/** Cidade usada no QR Code Pix gerado pros saques (campo "Merchant City" do BR Code) e a regra
 *  de "paga na mesma sexta ou na seguinte" quando o saque é solicitado numa sexta-feira. */
export async function definirConfigPixSaque(
  _prevState: ConfigPixSaqueState,
  formData: FormData
): Promise<ConfigPixSaqueState> {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") return { error: "Acesso negado." };

  const cidade = String(formData.get("cidadePagamentoPix") ?? "").trim();
  if (!cidade) return { error: "Informe a cidade." };

  const saquePagaMesmaSexta = formData.get("saquePagaMesmaSexta") === "1";

  await prisma.configuracaoSistema.upsert({
    where: { id: "default" },
    create: { id: "default", cidadePagamentoPix: cidade, saquePagaMesmaSexta },
    update: { cidadePagamentoPix: cidade, saquePagaMesmaSexta },
  });

  await prisma.logAuditoria.create({
    data: {
      userId: session.user.id,
      acao: "definir_config_pix_saque",
      detalhes: `cidade=${cidade} | pagaMesmaSexta=${saquePagaMesmaSexta}`,
    },
  });

  revalidatePath("/restrito/painel");
  revalidatePath("/restrito/configuracoes");
  return { sucesso: "Configuração de pagamento Pix atualizada." };
}
