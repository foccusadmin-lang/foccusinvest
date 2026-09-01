import type { CodigoServico } from "@prisma/client";

/**
 * Catálogo fixo dos Pacotes de Serviços — nomes, descrições e tarifas exatamente como definidos
 * no documento de especificação. Não inventar tarifas, contatos ou regras que não estejam lá.
 *
 * Tarifas em CENTAVOS (inteiros) — nunca em Float — pra garantir que a soma dê exatamente
 * R$ 52,63 e o pacote completo saia exatamente R$ 50,00, sem resíduo de ponto flutuante.
 */
export const TARIFA_CENTAVOS: Record<CodigoServico, number> = {
  TRANSFERENCIA_USUARIOS: 658,
  REAPLICACAO_AUTOMATICA: 658,
  ASSESSORIA_CONTABIL: 658,
  ASSESSORIA_JURIDICA: 658,
  ASSESSORIA_TI: 658,
  APLICACAO_BENS: 658,
  DOAR_ENTIDADE: 658,
  PLANO_LIDERANCA: 657,
  // Serviço adicional (fora do pacote completo original de 8) — mesma tarifa avulsa dos demais.
  SAQUE_EMERGENCIA: 658,
};

export const NOME_SERVICO: Record<CodigoServico, string> = {
  TRANSFERENCIA_USUARIOS: "Transferência entre usuários",
  REAPLICACAO_AUTOMATICA: "Reaplicação automática",
  ASSESSORIA_CONTABIL: "Assessoria Contábil",
  ASSESSORIA_JURIDICA: "Assessoria Jurídica",
  ASSESSORIA_TI: "Assessoria de TI",
  APLICACAO_BENS: "Aplicação em Bens",
  DOAR_ENTIDADE: "Doar para uma entidade",
  PLANO_LIDERANCA: "Plano de Liderança",
  SAQUE_EMERGENCIA: "Saque de emergência",
};

export const DESCRICAO_SERVICO: Record<CodigoServico, string> = {
  TRANSFERENCIA_USUARIOS:
    "Transfira valores do seu capital disponível para saque diretamente para outro investidor ativo no sistema.",
  REAPLICACAO_AUTOMATICA:
    "Configure a reaplicação automática do seu rendimento, bônus e/ou incentivo de liderança, sem precisar reaplicar manualmente.",
  ASSESSORIA_CONTABIL: "Atendimento direto por WhatsApp para tirar dúvidas contábeis.",
  ASSESSORIA_JURIDICA: "Atendimento direto por WhatsApp para tirar dúvidas jurídicas.",
  ASSESSORIA_TI: "Desenvolvimento de sites, sistemas e aplicativos.",
  APLICACAO_BENS: "Aplicação em bens — condições definidas pela administração.",
  DOAR_ENTIDADE: "Acesso à funcionalidade de doações para entidades cadastradas na plataforma.",
  PLANO_LIDERANCA:
    "Programa de liderança, liberado a partir de 30 usuários diretos ativos utilizando o seu código de indicação.",
  SAQUE_EMERGENCIA:
    "Deixa você elegível a receber, por decisão da administração, uma liberação excepcional de saque antes do prazo de carência.",
};

/** Ordem de exibição no catálogo — os 8 originais (seção 2 do documento) primeiro, depois os
 *  serviços adicionados depois (seção 10: "Toda atualização futura... deverá seguir
 *  automaticamente a estrutura do módulo"). */
export const ORDEM_SERVICOS: CodigoServico[] = [
  "TRANSFERENCIA_USUARIOS",
  "REAPLICACAO_AUTOMATICA",
  "ASSESSORIA_CONTABIL",
  "ASSESSORIA_JURIDICA",
  "ASSESSORIA_TI",
  "APLICACAO_BENS",
  "DOAR_ENTIDADE",
  "PLANO_LIDERANCA",
  "SAQUE_EMERGENCIA",
];

/** Contato/mensagem de WhatsApp já definidos no documento (Contábil e Jurídica) — semeados como
 *  dado (ServicoPacote.contatoWhatsapp/mensagemPadrao), editáveis pelo admin depois. TI fica sem
 *  valor padrão (documento explicitamente deixa em aberto, configurável pelo admin). */
export const CONTATO_WHATSAPP_PADRAO: Partial<Record<CodigoServico, string>> = {
  ASSESSORIA_CONTABIL: "5511978148334",
  ASSESSORIA_JURIDICA: "5511920930281",
};

export const MENSAGEM_WHATSAPP_PADRAO = "Olá {NOME}! Sou investidor(a) da Foccus Invest. Gostaria de tirar uma dúvida";

export function montarMensagemWhatsapp(template: string, nome: string): string {
  return template.replace("{NOME}", nome);
}

export function linkWhatsapp(numero: string, mensagem: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

/** Titular/código da carteira que recebe todo pagamento de serviço (documento, seção 5) — conta
 *  real já existente na plataforma (Grupo WD / grupowdoficial@gmail.com, cadastrada como
 *  Entidade), não uma conta nova. `obterEmpresaUserId` localiza esse usuário pelo código de
 *  indicação, que já é único. */
export const CARTEIRA_DESTINO_NOME = "WD INSIGHT RODRIGUES SOLUCOES E CONSULTORIA LTDA";
export const CARTEIRA_DESTINO_CODIGO = "2VPDV-GRUPO";

/** Meta de indicados diretos ativos pro Plano de Liderança (documento, seção 6.8). */
export const META_INDICADOS_LIDERANCA = 30;

// ---------------------------------------------------------------------------------------------
// Cálculo do pacote — tudo em centavos inteiros até o fim, só convertendo pra Float (Reais) na
// borda (o que já é o padrão do resto do projeto pra valores monetários no banco).
// ---------------------------------------------------------------------------------------------

/** Os 8 serviços originais do pacote completo (documento, seção 2) — não inclui serviços
 *  adicionados depois (ex: Saque de emergência), que ficam de fora do desconto de 5%/R$ 50,00
 *  a menos que o admin decida explicitamente incluir (documento, seção 10). */
export const CODIGOS_PACOTE_COMPLETO: CodigoServico[] = [
  "TRANSFERENCIA_USUARIOS",
  "REAPLICACAO_AUTOMATICA",
  "ASSESSORIA_CONTABIL",
  "ASSESSORIA_JURIDICA",
  "ASSESSORIA_TI",
  "APLICACAO_BENS",
  "DOAR_ENTIDADE",
  "PLANO_LIDERANCA",
];

export const SUBTOTAL_PACOTE_CENTAVOS = CODIGOS_PACOTE_COMPLETO.reduce(
  (acc, c) => acc + TARIFA_CENTAVOS[c],
  0
); // 5263 = R$ 52,63

export const PERCENTUAL_DESCONTO_PACOTE_MENSAL = 5;
/** R$ 52,63 × 5% = R$ 2,6315 → arredondado pro centavo, exatamente como o documento manda
 *  (seção 3.1). Fixo, não recalculado a cada chamada, pra nunca variar por causa de
 *  arredondamento de ponto flutuante. */
export const DESCONTO_PACOTE_MENSAL_CENTAVOS = 263; // R$ 2,63
export const VALOR_PACOTE_MENSAL_CENTAVOS = SUBTOTAL_PACOTE_CENTAVOS - DESCONTO_PACOTE_MENSAL_CENTAVOS; // 5000 = R$ 50,00

/** Valor fixo definido pelo usuário: pagando o pacote completo anualmente, o valor é R$ 550,00
 *  (não é subtotal×12 com desconto percentual — é o valor final já dado). */
export const VALOR_PACOTE_ANUAL_CENTAVOS = 55000; // R$ 550,00
/** Economia de pagar o ano todo de uma vez em vez de 12 mensalidades — só aritmética sobre os
 *  valores já definidos (12 × R$ 50,00 − R$ 550,00 = R$ 50,00), não uma regra nova. */
export const ECONOMIA_PACOTE_ANUAL_CENTAVOS = VALOR_PACOTE_MENSAL_CENTAVOS * 12 - VALOR_PACOTE_ANUAL_CENTAVOS;

export function centavosParaReais(centavos: number): number {
  return centavos / 100;
}

export type ResumoCobranca = {
  servicos: CodigoServico[];
  subtotalCentavos: number;
  descontoCentavos: number;
  valorFinalCentavos: number;
};

/** Contratação individual (um ou mais serviços avulsos, fora do pacote completo) — tarifa
 *  integral, sem desconto (documento, seção 3.2). */
export function calcularContratacaoIndividual(servicos: CodigoServico[]): ResumoCobranca {
  const subtotalCentavos = servicos.reduce((acc, c) => acc + TARIFA_CENTAVOS[c], 0);
  return { servicos, subtotalCentavos, descontoCentavos: 0, valorFinalCentavos: subtotalCentavos };
}

/** Pacote completo (8 serviços) — mensal com 5% de desconto (R$ 50,00) ou anual com o valor
 *  fixo de R$ 550,00 (documento, seção 3.3 + confirmação do usuário sobre o valor anual). */
export function calcularPacoteCompleto(forma: "PACOTE_MENSAL" | "PACOTE_ANUAL"): ResumoCobranca {
  if (forma === "PACOTE_MENSAL") {
    return {
      servicos: CODIGOS_PACOTE_COMPLETO,
      subtotalCentavos: SUBTOTAL_PACOTE_CENTAVOS,
      descontoCentavos: DESCONTO_PACOTE_MENSAL_CENTAVOS,
      valorFinalCentavos: VALOR_PACOTE_MENSAL_CENTAVOS,
    };
  }
  return {
    servicos: CODIGOS_PACOTE_COMPLETO,
    subtotalCentavos: VALOR_PACOTE_MENSAL_CENTAVOS * 12,
    descontoCentavos: ECONOMIA_PACOTE_ANUAL_CENTAVOS,
    valorFinalCentavos: VALOR_PACOTE_ANUAL_CENTAVOS,
  };
}
