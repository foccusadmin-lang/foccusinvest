"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda } from "@/lib/format";
import {
  calcularLiberacao,
  reservarCapitalParaSaque,
  reservarCreditosParaSaque,
  reaplicarSaldoDisponivel,
  getResumoCarteira,
  SaldoInsuficienteError,
} from "@/lib/carteira";
import { obterLiberacaoAtivaDoUsuario, executarSaqueEmergencial } from "@/lib/emergencia";
import {
  reaplicarSaldoPorFonte,
  type FonteReaplicacao,
  reservarSaqueRendimentoPorFonte,
  type FonteSaqueRendimento,
} from "@/lib/incentivo-lideranca";
import { getConfiguracao } from "@/lib/configuracao";
import { janelaSaqueRendimentoAberta, MENSAGEM_JANELA_FECHADA } from "@/lib/janela-saque";
import { valorPorExtenso } from "@/lib/valor-extenso";
import { enviarEmailContrato } from "@/lib/email";
import { guardarCodigoIndicadorPendente, creditarBonusIndicacaoPorCodigo } from "@/lib/indicacao";
import type { CategoriaBem } from "@prisma/client";
import { CARENCIA_MESES_PADRAO_BEM, calcularLiberacaoBem, LABEL_CATEGORIA_BEM } from "@/lib/bens";
import { confirmarAporte } from "@/lib/aportes";

export type AcaoState = { error?: string; sucesso?: string } | undefined;

function parseValor(raw: FormDataEntryValue | null): number {
  const texto = String(raw ?? "").trim().replace(/\./g, "").replace(",", ".");
  return Number(texto);
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado.");
  if (session.user.statusCadastro === "INCOMPLETO") {
    throw new Error("Complete seu cadastro antes de movimentar a carteira.");
  }
  // Checa o dado de verdade também — uma conta criada por outro caminho (ex: admin cria por
  // e-mail) pode ter status diferente de INCOMPLETO sem nunca ter preenchido CPF/CNPJ.
  const usuario = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { pessoaFisica: { select: { id: true } }, pessoaJuridica: { select: { id: true } } },
  });
  if (!usuario?.pessoaFisica && !usuario?.pessoaJuridica) {
    throw new Error("Complete seu cadastro antes de movimentar a carteira.");
  }
  return session.user.id;
}

/** Saques exigem cadastro completo e verificado (aprovado) — não basta ter só enviado os dados. */
async function requireVerifiedUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado.");
  if (session.user.statusCadastro !== "APROVADO") {
    throw new Error(
      "Você precisa completar o cadastro e ser verificado pelo administrador antes de sacar."
    );
  }
  return session.user.id;
}

const VALOR_MINIMO_APLICACAO = 50;
const VALOR_MINIMO_REAPLICACAO = 100;

const TAMANHO_MAXIMO_COMPROVANTE = 5 * 1024 * 1024;

export async function criarAplicacao(
  _prevState: AcaoState,
  formData: FormData
): Promise<AcaoState> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const valor = parseValor(formData.get("valor"));
  if (!valor || valor <= 0 || Number.isNaN(valor)) {
    return { error: "Informe um valor válido." };
  }
  if (valor < VALOR_MINIMO_APLICACAO) {
    return { error: `O valor mínimo de aplicação é ${formatMoeda(VALOR_MINIMO_APLICACAO)}.` };
  }

  const comprovante = formData.get("comprovante");
  if (!(comprovante instanceof File) || comprovante.size === 0) {
    return { error: "Envie o comprovante de pagamento do Pix." };
  }
  if (comprovante.size > TAMANHO_MAXIMO_COMPROVANTE) {
    return { error: "Arquivo muito grande. Envie um comprovante de até 5MB." };
  }

  const codigoIndicador = String(formData.get("codigoIndicador") ?? "").trim().toUpperCase();
  if (codigoIndicador) {
    const indicador = await prisma.user.findUnique({ where: { codigoIndicacao: codigoIndicador } });
    if (!indicador) return { error: "Código de indicação não encontrado." };
    if (indicador.id === userId) {
      return { error: "Você não pode usar o seu próprio código de indicação." };
    }
  }

  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    include: { pessoaFisica: true, pessoaJuridica: true },
  });
  if (!usuario) return { error: "Usuário não encontrado." };
  if (!usuario.pessoaFisica && !usuario.pessoaJuridica) {
    return { error: "Complete seu cadastro antes de aplicar." };
  }

  const nomeContrato = usuario.pessoaFisica?.nomeCompleto ?? usuario.pessoaJuridica!.representanteLegal;
  const cpfContrato = usuario.pessoaFisica?.cpf ?? usuario.pessoaJuridica!.cpfRepresentante;
  const rg = usuario.pessoaFisica?.rg ?? usuario.pessoaJuridica?.rgRepresentante ?? null;
  const nacionalidade =
    usuario.pessoaFisica?.nacionalidade ?? usuario.pessoaJuridica?.nacionalidadeRepresentante ?? null;
  const estadoCivil =
    usuario.pessoaFisica?.estadoCivil ?? usuario.pessoaJuridica?.estadoCivilRepresentante ?? null;
  const profissao =
    usuario.pessoaFisica?.profissao ?? usuario.pessoaJuridica?.profissaoRepresentante ?? null;
  const telefone = usuario.pessoaFisica?.telefone ?? usuario.pessoaJuridica?.telefone ?? null;
  const endereco = usuario.pessoaFisica?.endereco ?? usuario.pessoaJuridica?.endereco ?? null;
  const valorExtenso = valorPorExtenso(valor);

  const bytes = Buffer.from(await comprovante.arrayBuffer());

  const aplicacao = await prisma.$transaction(async (tx) => {
    const aplicacaoCriada = await tx.aplicacao.create({
      data: {
        userId,
        valor,
        moeda: "BRL",
        status: "AGUARDANDO_APROVACAO",
        liberaEm: calcularLiberacao(),
        comprovante: bytes,
        comprovanteNome: comprovante.name,
        comprovanteTipo: comprovante.type || "application/octet-stream",
        // Guarda o código de indicação até a aprovação — só é lido e limpo em confirmarAporte,
        // que credita o bônus. Nunca aparece pro investidor (só é exibido p/ REJEITADA).
        motivoRejeicao: codigoIndicador ? guardarCodigoIndicadorPendente(codigoIndicador) : null,
      },
    });

    await tx.contrato.create({
      data: {
        userId,
        aplicacaoId: aplicacaoCriada.id,
        nome: nomeContrato,
        email: usuario.email,
        cpf: cpfContrato,
        rg,
        nacionalidade,
        estadoCivil,
        profissao,
        telefone,
        endereco,
        valor,
        valorExtenso,
        confirmouLeituraEm: new Date(),
      },
    });

    return aplicacaoCriada;
  });

  await enviarEmailContrato({
    nome: nomeContrato,
    email: usuario.email,
    cpf: cpfContrato,
    rg,
    nacionalidade,
    estadoCivil,
    profissao,
    telefone,
    endereco,
    valor,
    valorExtenso,
    data: new Date(),
  });

  // Modo automático de Aprovação de Aportes: confirma na hora, sem esperar o admin — só vale
  // pra aporte via Pix (comprovante já em mãos); aporte em bem sempre exige avaliação manual do
  // admin, em qualquer modo (ver solicitarAporteBem).
  const config = await getConfiguracao();
  if (config.modoAprovacaoAporte === "AUTOMATICO") {
    await confirmarAporte(aplicacao.id, null);
    revalidatePath("/restrito/aportes");
    revalidatePath("/restrito/painel");
    revalidatePath("/painel");
    return {
      sucesso: `Aporte de ${formatMoeda(valor)} confirmado automaticamente! O valor já está na sua carteira, com carência de 90 dias. O contrato foi enviado para o seu e-mail.`,
    };
  }

  revalidatePath("/painel");
  return {
    sucesso: `Comprovante de ${formatMoeda(valor)} enviado! Assim que o admin confirmar o pagamento, o valor entra na sua carteira com carência de 90 dias. O contrato foi enviado para o seu e-mail.`,
  };
}

const CATEGORIAS_BEM: CategoriaBem[] = ["IMOVEL", "AUTOMOVEL", "ELETRONICO"];

/** Solicita um aporte em bem (imóvel/automóvel/eletrônico) em vez de Pix — não exige comprovante
 *  nem gera contrato ainda: o investidor só agenda a entrega/avaliação, e o admin confirma
 *  depois de avaliar o bem em mãos (ver aprovarAporte com ajusteBem, em restrito/aportes/actions.ts),
 *  podendo ajustar o valor e a carência de acordo com o estado do bem. */
export async function solicitarAporteBem(
  _prevState: AcaoState,
  formData: FormData
): Promise<AcaoState> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const categoria = String(formData.get("categoria") ?? "") as CategoriaBem;
  if (!CATEGORIAS_BEM.includes(categoria)) {
    return { error: "Selecione uma categoria válida." };
  }

  const valorDeclarado = parseValor(formData.get("valorDeclarado"));
  if (!valorDeclarado || valorDeclarado <= 0 || Number.isNaN(valorDeclarado)) {
    return { error: "Informe um valor estimado válido." };
  }
  if (valorDeclarado < VALOR_MINIMO_APLICACAO) {
    return { error: `O valor mínimo de aplicação é ${formatMoeda(VALOR_MINIMO_APLICACAO)}.` };
  }

  // Cada categoria tem exigência própria de avaliação — monta a descrição final aqui (servidor),
  // não confia só na validação do cliente, já que são regras de elegibilidade do aporte.
  let descricaoBem: string;
  if (categoria === "IMOVEL") {
    const endereco = String(formData.get("enderecoImovel") ?? "").trim();
    const escrituraConfirmada = String(formData.get("escrituraConfirmada") ?? "") === "1";
    if (endereco.length < 10) {
      return { error: "Informe o endereço completo do imóvel." };
    }
    if (!escrituraConfirmada) {
      return {
        error: "É obrigatório ter escritura lavrada em cartório para aportar um imóvel. Confirme a declaração.",
      };
    }
    descricaoBem = `Endereço: ${endereco}\nEscritura lavrada em cartório: confirmada pelo investidor.`;
  } else if (categoria === "AUTOMOVEL") {
    const marcaModelo = String(formData.get("marcaModeloVeiculo") ?? "").trim();
    const ano = String(formData.get("anoVeiculo") ?? "").trim();
    const placa = String(formData.get("placaVeiculo") ?? "").trim();
    const estado = String(formData.get("estadoVeiculo") ?? "").trim();
    if (!marcaModelo || !ano) {
      return { error: "Informe a marca/modelo e o ano do veículo." };
    }
    if (estado.length < 5) {
      return { error: "Descreva o estado atual do veículo (funilaria, mecânica, km rodados etc)." };
    }
    descricaoBem = `Veículo: ${marcaModelo} ${ano}${placa ? ` — placa ${placa}` : ""}\nEstado atual: ${estado}\nBase de valor: Tabela FIPE + avaliação do estado do veículo.`;
  } else {
    const modelo = String(formData.get("modeloEletronico") ?? "").trim();
    const ano = String(formData.get("anoEletronico") ?? "").trim();
    const estado = String(formData.get("estadoEletronico") ?? "").trim();
    if (!modelo || !ano) {
      return { error: "Informe o modelo e o ano do aparelho." };
    }
    if (estado.length < 5) {
      return { error: "Descreva o estado atual do aparelho (funcionamento, riscos, acessórios etc)." };
    }
    descricaoBem = `Aparelho: ${modelo}\nAno: ${ano}\nEstado atual: ${estado}`;
  }

  const dataAgendamentoTexto = String(formData.get("dataAgendamento") ?? "").trim();
  const dataAgendamento = dataAgendamentoTexto ? new Date(dataAgendamentoTexto) : null;
  if (!dataAgendamento || Number.isNaN(dataAgendamento.getTime())) {
    return { error: "Escolha uma data e horário para entregar o bem para avaliação." };
  }
  if (dataAgendamento.getTime() <= Date.now()) {
    return { error: "O agendamento precisa ser numa data/horário futuro." };
  }

  await prisma.aplicacao.create({
    data: {
      userId,
      valor: valorDeclarado,
      valorDeclarado,
      moeda: "BRL",
      origem: "NOVA_APLICACAO",
      status: "AGUARDANDO_APROVACAO",
      categoriaBem: categoria,
      descricaoBem,
      dataAgendamento,
      // Provisório — recalculado com o valor definitivo (e possível ajuste do admin) na
      // confirmação. Precisa de algum valor não-nulo até lá pra satisfazer a coluna obrigatória.
      liberaEm: calcularLiberacaoBem(CARENCIA_MESES_PADRAO_BEM[categoria]),
    },
  });

  revalidatePath("/painel");
  return {
    sucesso: `Agendamento confirmado! Leve o ${LABEL_CATEGORIA_BEM[categoria].toLowerCase()} pra avaliação na data marcada. Depois que o admin avaliar e confirmar, o valor entra na sua carteira com a carência mínima de ${CARENCIA_MESES_PADRAO_BEM[categoria]} meses.`,
  };
}

export async function solicitarSaqueCapital(
  _prevState: AcaoState,
  formData: FormData
): Promise<AcaoState> {
  let userId: string;
  try {
    userId = await requireVerifiedUserId();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const valor = parseValor(formData.get("valor"));
  if (!valor || valor <= 0 || Number.isNaN(valor)) {
    return { error: "Informe um valor válido." };
  }

  const chavePix = String(formData.get("chavePix") ?? "").trim();
  if (!chavePix) {
    return { error: "Informe a chave Pix para receber o saque." };
  }

  const config = await getConfiguracao();
  const automatico = config.modoSaqueCapital === "AUTOMATICO";

  try {
    await prisma.$transaction(async (tx) => {
      const saque = await tx.solicitacaoSaque.create({
        // Reaproveita motivoEmergencia (só usado em saques emergenciais) pra guardar a
        // chave Pix nos saques normais, sem precisar de coluna nova no banco.
        data: { userId, tipo: "CAPITAL", valor, moeda: "BRL", motivoEmergencia: chavePix },
      });
      await reservarCapitalParaSaque(tx, userId, valor, saque.id);

      if (automatico) {
        await tx.aplicacao.updateMany({
          where: { solicitacaoSaqueId: saque.id },
          data: { status: "RETIRADA" },
        });
        await tx.solicitacaoSaque.update({
          where: { id: saque.id },
          data: { status: "PAGO", processadoEm: new Date() },
        });
      }
    });
  } catch (e) {
    if (e instanceof SaldoInsuficienteError) {
      return { error: e.message };
    }
    throw e;
  }

  revalidatePath("/painel");
  return {
    sucesso: automatico
      ? `Saque de ${formatMoeda(valor)} processado automaticamente.`
      : `Saque de ${formatMoeda(valor)} solicitado. Aguarde aprovação.`,
  };
}

export async function solicitarSaqueRendimento(
  _prevState: AcaoState,
  formData: FormData
): Promise<AcaoState> {
  let userId: string;
  try {
    userId = await requireVerifiedUserId();
  } catch (e) {
    return { error: (e as Error).message };
  }

  if (!janelaSaqueRendimentoAberta()) {
    return { error: MENSAGEM_JANELA_FECHADA };
  }

  const valor = parseValor(formData.get("valor"));
  if (!valor || valor <= 0 || Number.isNaN(valor)) {
    return { error: "Informe um valor válido." };
  }

  const chavePix = String(formData.get("chavePix") ?? "").trim();
  if (!chavePix) {
    return { error: "Informe a chave Pix para receber o saque." };
  }

  const config = await getConfiguracao();
  const automatico = config.modoSaqueRendimento === "AUTOMATICO";

  try {
    await prisma.$transaction(async (tx) => {
      const saque = await tx.solicitacaoSaque.create({
        // Reaproveita motivoEmergencia (só usado em saques emergenciais) pra guardar a
        // chave Pix nos saques normais, sem precisar de coluna nova no banco.
        data: { userId, tipo: "RENDIMENTO", valor, moeda: "BRL", motivoEmergencia: chavePix },
      });
      await reservarCreditosParaSaque(tx, userId, valor, "RENDIMENTO", saque.id);

      if (automatico) {
        await tx.creditoCarteira.updateMany({
          where: { solicitacaoSaqueId: saque.id },
          data: { utilizadoEm: new Date() },
        });
        await tx.solicitacaoSaque.update({
          where: { id: saque.id },
          data: { status: "PAGO", processadoEm: new Date() },
        });
      }
    });
  } catch (e) {
    if (e instanceof SaldoInsuficienteError) {
      return { error: e.message };
    }
    throw e;
  }

  revalidatePath("/painel");
  return {
    sucesso: automatico
      ? `Saque de rendimentos de ${formatMoeda(valor)} processado automaticamente.`
      : `Saque de rendimentos de ${formatMoeda(valor)} solicitado. Aguarde aprovação.`,
  };
}

/** Igual a `solicitarSaqueRendimento`, mas deixa o investidor escolher exatamente de onde vem
 *  o valor — PLR e/ou incentivo de liderança (só pra líder), cada um total ou parcial — em vez
 *  de consumir tudo misturado numa fila só. Cria uma única solicitação de saque. */
export async function solicitarSaqueRendimentoPorFonte(
  _prevState: AcaoState,
  formData: FormData
): Promise<AcaoState> {
  let userId: string;
  try {
    userId = await requireVerifiedUserId();
  } catch (e) {
    return { error: (e as Error).message };
  }

  if (!janelaSaqueRendimentoAberta()) {
    return { error: MENSAGEM_JANELA_FECHADA };
  }

  const usuario = await prisma.user.findUnique({ where: { id: userId }, select: { perfil: true } });
  const ehLider = usuario?.perfil === "LIDER";

  const chavePix = String(formData.get("chavePix") ?? "").trim();
  if (!chavePix) {
    return { error: "Informe a chave Pix para receber o saque." };
  }

  const fontes = formData.getAll("fontes").map(String) as FonteSaqueRendimento[];
  if (fontes.length === 0) {
    return { error: "Selecione ao menos uma fonte pra sacar." };
  }

  const itens: { fonte: FonteSaqueRendimento; valor: number }[] = [];
  for (const fonte of fontes) {
    if (fonte !== "PLR" && fonte !== "INCENTIVO_LIDERANCA") {
      return { error: "Fonte inválida." };
    }
    if (fonte === "INCENTIVO_LIDERANCA" && !ehLider) {
      return { error: "Incentivo de liderança só pode ser sacado por quem é líder." };
    }
    const valor = parseValor(formData.get(`valor_${fonte}`));
    if (!valor || valor <= 0 || Number.isNaN(valor)) {
      return { error: "Informe um valor válido para cada fonte selecionada." };
    }
    itens.push({ fonte, valor });
  }

  const total = itens.reduce((acc, i) => acc + i.valor, 0);
  if (!total || total <= 0) {
    return { error: "Informe um valor válido." };
  }

  const config = await getConfiguracao();
  const automatico = config.modoSaqueRendimento === "AUTOMATICO";

  try {
    await prisma.$transaction(async (tx) => {
      const saque = await tx.solicitacaoSaque.create({
        data: { userId, tipo: "RENDIMENTO", valor: total, moeda: "BRL", motivoEmergencia: chavePix },
      });
      await reservarSaqueRendimentoPorFonte(tx, userId, itens, saque.id);

      if (automatico) {
        await tx.creditoCarteira.updateMany({
          where: { solicitacaoSaqueId: saque.id },
          data: { utilizadoEm: new Date() },
        });
        await tx.solicitacaoSaque.update({
          where: { id: saque.id },
          data: { status: "PAGO", processadoEm: new Date() },
        });
      }
    });
  } catch (e) {
    if (e instanceof SaldoInsuficienteError) {
      return { error: e.message };
    }
    throw e;
  }

  revalidatePath("/painel");
  revalidatePath("/painel/historico");
  return {
    sucesso: automatico
      ? `Saque de rendimentos de ${formatMoeda(total)} processado automaticamente.`
      : `Saque de rendimentos de ${formatMoeda(total)} solicitado. Aguarde aprovação.`,
  };
}

export async function solicitarSaqueEmergencia(
  _prevState: AcaoState,
  formData: FormData
): Promise<AcaoState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autenticado." };
  if (session.user.statusCadastro !== "APROVADO") {
    return {
      error: "Você precisa completar o cadastro e ser verificado pelo administrador antes de sacar.",
    };
  }

  const userId = session.user.id;
  const liberacao = await obterLiberacaoAtivaDoUsuario(userId);
  if (!liberacao) {
    return {
      error:
        "Esta aplicação ainda está no período de carência. Para solicitar um saque emergencial, entre em contato com a administração.",
    };
  }

  const capitalSolicitado = parseValor(formData.get("valor"));
  const incluirRendimento = String(formData.get("incluirRendimento") ?? "0") === "1";

  const resumo = await getResumoCarteira(userId);
  const rendimentoDisponivel = resumo.distribuicoesDisponiveis;

  const resultado = await executarSaqueEmergencial({
    userId,
    liberacao,
    capitalSolicitado,
    incluirRendimento,
    rendimentoDisponivel,
  });

  if (resultado.error) return { error: resultado.error };

  revalidatePath("/painel");
  revalidatePath("/restrito/usuarios");
  revalidatePath("/restrito/saques");

  return { sucesso: resultado.mensagem };
}

export async function reaplicar(
  _prevState: AcaoState,
  formData: FormData
): Promise<AcaoState> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const valor = parseValor(formData.get("valor"));
  if (!valor || valor <= 0 || Number.isNaN(valor)) {
    return { error: "Informe um valor válido." };
  }
  if (valor < VALOR_MINIMO_REAPLICACAO) {
    return { error: `A reaplicação mínima é ${formatMoeda(VALOR_MINIMO_REAPLICACAO)}.` };
  }

  try {
    await prisma.$transaction((tx) => reaplicarSaldoDisponivel(tx, userId, valor));
  } catch (e) {
    if (e instanceof SaldoInsuficienteError) {
      return { error: e.message };
    }
    throw e;
  }

  revalidatePath("/painel");
  return { sucesso: `${formatMoeda(valor)} reaplicados. Novo lote com carência de 90 dias criado.` };
}

/** Igual a `reaplicar`, mas deixa o investidor escolher exatamente de onde vem o valor — PLR,
 *  incentivo de liderança (só pra líder) e/ou bônus, cada um total ou parcial — em vez de
 *  consumir tudo misturado numa fila só. */
export async function reaplicarPorFonte(
  _prevState: AcaoState,
  formData: FormData
): Promise<AcaoState> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const usuario = await prisma.user.findUnique({ where: { id: userId }, select: { perfil: true } });
  const ehLider = usuario?.perfil === "LIDER";

  const fontes = formData.getAll("fontes").map(String) as FonteReaplicacao[];
  if (fontes.length === 0) {
    return { error: "Selecione ao menos uma fonte pra reaplicar." };
  }

  const itens: { fonte: FonteReaplicacao; valor: number }[] = [];
  for (const fonte of fontes) {
    if (fonte !== "PLR" && fonte !== "INCENTIVO_LIDERANCA" && fonte !== "BONUS") {
      return { error: "Fonte inválida." };
    }
    if (fonte === "INCENTIVO_LIDERANCA" && !ehLider) {
      return { error: "Incentivo de liderança só pode ser reaplicado por quem é líder." };
    }
    const valor = parseValor(formData.get(`valor_${fonte}`));
    if (!valor || valor <= 0 || Number.isNaN(valor)) {
      return { error: "Informe um valor válido para cada fonte selecionada." };
    }
    itens.push({ fonte, valor });
  }

  const total = itens.reduce((acc, i) => acc + i.valor, 0);
  if (total < VALOR_MINIMO_REAPLICACAO) {
    return { error: `A reaplicação mínima é ${formatMoeda(VALOR_MINIMO_REAPLICACAO)}.` };
  }

  try {
    await prisma.$transaction((tx) => reaplicarSaldoPorFonte(tx, userId, itens));
  } catch (e) {
    if (e instanceof SaldoInsuficienteError) {
      return { error: e.message };
    }
    throw e;
  }

  revalidatePath("/painel");
  revalidatePath("/painel/historico");
  return {
    sucesso: `${formatMoeda(total)} reaplicados. Novo lote com carência de 90 dias criado.`,
  };
}

/** Pra quando a pessoa esquece de colocar o código de indicação na hora da aplicação — ela
 *  mesma pode lançar depois, sobre um aporte próprio já confirmado. Só funciona uma vez por
 *  aporte (creditarBonusIndicacaoPorCodigo é idempotente por aplicacaoId). */
export async function adicionarIndicacaoPropria(
  aplicacaoId: string,
  codigoIndicador: string
): Promise<{ error?: string; sucesso?: string }> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const aplicacao = await prisma.aplicacao.findUnique({ where: { id: aplicacaoId } });
  if (!aplicacao || aplicacao.userId !== userId) {
    return { error: "Aplicação não encontrada." };
  }
  if (aplicacao.origem !== "NOVA_APLICACAO" || aplicacao.status !== "CONFIRMADA") {
    return { error: "Só é possível lançar indicação em uma nova aplicação já confirmada." };
  }

  const resultado = await prisma.$transaction((tx) =>
    creditarBonusIndicacaoPorCodigo(tx, {
      codigoIndicador,
      aplicacaoId: aplicacao.id,
      aportanteUserId: userId,
      valorAporte: aplicacao.valor,
    })
  );
  if (resultado.error) return { error: resultado.error };

  revalidatePath("/painel");
  revalidatePath("/painel/historico");
  return { sucesso: "Código lançado! O bônus já foi creditado pra essa pessoa." };
}

export type AporteElegivelIndicacao = { id: string; valor: number; criadoEm: Date };

/** Lista os aportes do investidor logado que ainda podem receber um código de indicação
 *  (nova aplicação, já confirmada, sem bônus já creditado por ela). */
/** O bônus de indicação só vale no primeiro aporte do indicado — então só o primeiro
 *  "Nova Aplicação" confirmado (e ainda sem bônus creditado) fica elegível pra lançar código. */
export async function listarAportesElegiveisIndicacao(): Promise<AporteElegivelIndicacao[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const primeiroAporte = await prisma.aplicacao.findFirst({
    where: {
      userId: session.user.id,
      origem: "NOVA_APLICACAO",
      status: { in: ["CONFIRMADA", "SAQUE_SOLICITADO", "RETIRADA"] },
    },
    orderBy: { criadoEm: "asc" },
    select: { id: true, valor: true, criadoEm: true },
  });
  if (!primeiroAporte) return [];

  const bonusJaCreditado = await prisma.creditoCarteira.findFirst({
    where: { tipo: "BONUS", origem: { endsWith: `(${primeiroAporte.id})` } },
  });
  if (bonusJaCreditado) return [];

  return [{ id: primeiroAporte.id, valor: primeiroAporte.valor, criadoEm: primeiroAporte.criadoEm }];
}
