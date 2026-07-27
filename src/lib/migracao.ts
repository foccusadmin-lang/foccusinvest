import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { onlyDigits } from "@/lib/cpf-cnpj";

/** Normaliza pra comparar nomes com diferenças de acento/caixa/espaço, sem exigir igualdade
 *  caractere a caractere (ex: "João Da Silva " === "joao da silva"). */
export function normalizarNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Chamado logo após a pessoa completar o cadastro (PF ou PJ). Se existir saldo migrado
 *  pendente para o mesmo documento, move para "aguardando aprovação" — nunca credita sozinho.
 *  O admin sempre confere nome e valor na tela de Migração antes de aprovar o lançamento. */
export async function aplicarMigracaoPendente(
  tx: Prisma.TransactionClient,
  userId: string,
  documentoBruto: string,
  nomeCompleto: string
): Promise<void> {
  const documento = onlyDigits(documentoBruto);
  const pendente = await tx.migracaoSaldo.findUnique({ where: { documento } });
  if (!pendente || pendente.status !== "PENDENTE") return;

  const nomeConfere = normalizarNome(pendente.nomeReferencia) === normalizarNome(nomeCompleto);

  await tx.migracaoSaldo.update({
    where: { id: pendente.id },
    data: {
      status: "AGUARDANDO_APROVACAO",
      userId,
      observacao: nomeConfere
        ? null
        : `Documento bateu, mas o nome do cadastro ("${nomeCompleto}") diverge do nome da planilha ("${pendente.nomeReferencia}"). Confira antes de aprovar.`,
    },
  });
}

/** Chamado logo após a conta ser criada (registro por e-mail/senha ou primeiro login com
 *  Google) — antes mesmo da pessoa preencher CPF. Se existir saldo migrado esperando esse
 *  e-mail (com ou sem CPF na planilha), já vincula a conta e deixa aguardando aprovação. */
export async function vincularMigracaoPorEmail(userId: string, email: string): Promise<void> {
  const emailNormalizado = email.trim().toLowerCase();
  if (!emailNormalizado) return;

  const pendente = await prisma.migracaoSaldo.findFirst({
    where: {
      emailReferencia: emailNormalizado,
      status: { in: ["PENDENTE", "SEM_DOCUMENTO"] },
    },
  });
  if (!pendente) return;

  await prisma.migracaoSaldo.update({
    where: { id: pendente.id },
    data: { status: "AGUARDANDO_APROVACAO", userId },
  });
}

export function parseValorPlanilha(raw: string): number {
  const limpo = raw.trim().replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  return Number(limpo);
}

function dividirLinhaCsv(linha: string): string[] {
  const separador = linha.includes(";") ? ";" : ",";
  return linha.split(separador).map((c) => c.trim().replace(/^"|"$/g, ""));
}

export type LinhaMigracaoCsv = {
  nome: string;
  documento: string;
  email: string;
  valor: number;
  linha: number;
};

/** Faz o parse de um CSV (nome, documento, e-mail, valor — nessa ordem por padrão, ou em
 *  qualquer ordem se o arquivo tiver cabeçalho) e retorna as linhas prontas para importar.
 *  documento e email podem vir vazios (planilha antiga sem CPF cadastrado) — quem chama decide
 *  o que fazer com cada caso. Não toca no banco. */
export function parseCsvMigracao(
  conteudo: string
): LinhaMigracaoCsv[] | { erro: string } {
  const linhas = conteudo
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (linhas.length === 0) return { erro: "Arquivo vazio." };

  const primeiraColunas = dividirLinhaCsv(linhas[0]).map((c) => c.toLowerCase());
  const nomesConhecidos = ["nome", "documento", "cpf", "cnpj", "email", "e-mail", "valor"];
  const temCabecalho = primeiraColunas.some((c) => nomesConhecidos.includes(c));

  // Com cabeçalho, descobre a posição de cada coluna pelo nome. Sem cabeçalho, assume a ordem
  // padrão: nome, documento, email, valor (ou nome, documento, valor se vierem só 3 colunas).
  let idxNome = 0;
  let idxDocumento = 1;
  let idxEmail = 2;
  let idxValor = 3;

  if (temCabecalho) {
    idxNome = primeiraColunas.indexOf("nome");
    idxDocumento = primeiraColunas.findIndex((c) => ["documento", "cpf", "cnpj"].includes(c));
    idxEmail = primeiraColunas.findIndex((c) => ["email", "e-mail"].includes(c));
    idxValor = primeiraColunas.indexOf("valor");
  }

  const linhasDados = temCabecalho ? linhas.slice(1) : linhas;

  const resultado: LinhaMigracaoCsv[] = [];
  for (let i = 0; i < linhasDados.length; i++) {
    const colunas = dividirLinhaCsv(linhasDados[i]);
    if (colunas.length < 3) continue;

    // Fallback posicional pra arquivo sem cabeçalho e sem coluna de e-mail (3 colunas antigas).
    const semColunaEmail = !temCabecalho && colunas.length === 3;
    const posValor = semColunaEmail ? 2 : idxValor;
    const posEmail = semColunaEmail ? -1 : idxEmail;

    const nome = colunas[idxNome] ?? "";
    const documentoBruto = idxDocumento >= 0 ? colunas[idxDocumento] ?? "" : "";
    const emailBruto = posEmail >= 0 ? colunas[posEmail] ?? "" : "";
    const valorBruto = colunas[posValor] ?? "";

    resultado.push({
      nome: nome.trim(),
      documento: onlyDigits(documentoBruto),
      email: emailBruto.trim().toLowerCase(),
      valor: parseValorPlanilha(valorBruto),
      linha: i + (temCabecalho ? 2 : 1),
    });
  }

  return resultado;
}
