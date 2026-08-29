import { prisma } from "@/lib/prisma";
import { getConfiguracao } from "@/lib/configuracao";
import { gerarPayloadPix } from "@/lib/pix";
import { normalizarChavePix, type TipoChavePixForm } from "@/lib/pix-chave";
import { gerarTxid } from "@/lib/pix-txid";
import { gerarQrCodePng } from "@/lib/qrcode-pix";
import { proximaSextaPagamento } from "@/lib/datas";
import { arredondarParaCentavos } from "@/lib/valor-centavos";

export type DadosSaquePix = {
  investidorNome: string;
  investidorEmail: string;
  valorFinal: number;
  chavePixOriginal: string;
  chavePixNormalizada: string;
  chavePixTipo: TipoChavePixForm;
  pixPayload: string;
  pixQrCodePng: Buffer<ArrayBuffer>;
  pixTxid: string;
  dataProgramadaPagamento: Date;
};

export type ResultadoPrepararSaquePix = { ok: false; error: string } | { ok: true; dados: DadosSaquePix };

/** Nome/e-mail "oficiais" do investidor (mesmo usado em contrato/comprovante) pra guardar junto
 *  da solicitação de saque — prioriza o cadastro (pessoaFisica/pessoaJuridica) sobre o nome de
 *  login (Google), que pode não bater com o nome civil/razão social. Usado tanto pelo
 *  autoatendimento (painel/actions.ts) quanto pelo saque assistido feito pelo admin
 *  (restrito/usuarios/ajuste-actions.ts). */
export async function obterSnapshotInvestidor(userId: string): Promise<{ nome: string; email: string }> {
  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    include: { pessoaFisica: true, pessoaJuridica: true },
  });
  const nome =
    usuario?.pessoaFisica?.nomeCompleto ??
    usuario?.pessoaJuridica?.razaoSocial ??
    usuario?.name ??
    "Investidor";
  return { nome, email: usuario?.email ?? "" };
}

/**
 * Ponto único que gera tudo que uma solicitação de saque precisa pra pagamento via Pix: valida
 * e normaliza a chave, gera um TXID único, monta o Pix Copia e Cola (EMV/BR Code) e a imagem do
 * QR Code, e calcula a data programada de pagamento (próxima sexta-feira, respeitando a regra
 * configurada pelo admin). Chamado pelos três fluxos de solicitação de saque (capital,
 * rendimento e rendimento por fonte) — nunca recalculado depois: se algo precisar mudar, o
 * pedido é recusado/cancelado e um novo é criado (ver painel/actions.ts).
 */
export async function prepararDadosSaquePix(params: {
  investidorNome: string;
  investidorEmail: string;
  valor: number;
  chavePixTexto: string;
  chavePixTipo: string;
}): Promise<ResultadoPrepararSaquePix> {
  const { investidorNome, investidorEmail, valor, chavePixTexto, chavePixTipo } = params;

  const tiposValidos: TipoChavePixForm[] = ["TELEFONE", "CPF", "CNPJ", "EMAIL", "ALEATORIA"];
  if (!tiposValidos.includes(chavePixTipo as TipoChavePixForm)) {
    return { ok: false, error: "Selecione o tipo da chave Pix." };
  }

  const resultado = normalizarChavePix(chavePixTexto, chavePixTipo as TipoChavePixForm);
  if (!resultado.ok) return { ok: false, error: resultado.error };

  if (!valor || valor <= 0 || Number.isNaN(valor)) {
    return { ok: false, error: "Informe um valor válido." };
  }
  const valorFinal = arredondarParaCentavos(valor);

  const config = await getConfiguracao();
  const dataProgramadaPagamento = proximaSextaPagamento(config.saquePagaMesmaSexta);

  // TXID precisa ser único — o índice @unique no banco é quem garante de verdade, isso aqui só
  // evita expor uma colisão (estatisticamente quase impossível) como erro pro investidor.
  let txid = gerarTxid();
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const existente = await prisma.solicitacaoSaque.findUnique({ where: { pixTxid: txid } });
    if (!existente) break;
    txid = gerarTxid();
  }

  const pixPayload = gerarPayloadPix({
    chave: resultado.chaveNormalizada,
    beneficiario: investidorNome,
    cidade: config.cidadePagamentoPix,
    valor: valorFinal,
    identificador: txid,
  });

  const pixQrCodePng = await gerarQrCodePng(pixPayload);

  return {
    ok: true,
    dados: {
      investidorNome,
      investidorEmail,
      valorFinal,
      chavePixOriginal: chavePixTexto.trim(),
      chavePixNormalizada: resultado.chaveNormalizada,
      chavePixTipo: resultado.tipo,
      pixPayload,
      pixQrCodePng,
      pixTxid: txid,
      dataProgramadaPagamento,
    },
  };
}
