/** Blocos do dashboard do investidor que o admin pode ligar/desligar em /restrito/estrategia
 *  (Vitrine de Operação). Os `campo` são exatamente as colunas booleanas de ConfiguracaoSistema. */
export const SECOES_PAINEL = [
  {
    campo: "mostrarEstrategia",
    chave: "estrategia",
    titulo: "Estratégia",
    descricao: "Bloco \"Operações\": nome da estratégia, acumulado, resultado do último dia e faixa esperada.",
  },
  {
    campo: "mostrarComparativo",
    chave: "comparativo",
    titulo: "Comparativo",
    descricao: "Gráfico comparativo da estratégia, calculado a partir dos lançamentos diários.",
  },
  {
    campo: "mostrarPerfilOperacao",
    chave: "perfilOperacao",
    titulo: "Perfil de operação",
    descricao: "Onde operamos e o perfil (Conservador, Moderado, Agressivo, Superagressivo) do último lançamento.",
  },
  {
    campo: "mostrarEvolucaoRendimentos",
    chave: "evolucaoRendimentos",
    titulo: "Evolução dos rendimentos",
    descricao: "Gráfico das liberações de rendimento das últimas sextas-feiras.",
  },
  {
    campo: "mostrarRentabilidadeIndices",
    chave: "rentabilidadeIndices",
    titulo: "Rentabilidade versus índices",
    descricao: "Comparativo da rentabilidade da Foccus com os índices de mercado.",
  },
] as const;

export type CampoSecaoPainel = (typeof SECOES_PAINEL)[number]["campo"];
export type ChaveSecaoPainel = (typeof SECOES_PAINEL)[number]["chave"];
export type SecoesPainel = Record<ChaveSecaoPainel, boolean>;

/** Tudo visível — padrão quando nada foi configurado (e nas telas de preview). */
export const SECOES_PAINEL_PADRAO: SecoesPainel = {
  estrategia: true,
  comparativo: true,
  perfilOperacao: true,
  evolucaoRendimentos: true,
  rentabilidadeIndices: true,
};

export function ehCampoSecaoPainel(valor: string): valor is CampoSecaoPainel {
  return SECOES_PAINEL.some((s) => s.campo === valor);
}

export function secoesDaConfiguracao(config: Record<CampoSecaoPainel, boolean>): SecoesPainel {
  return {
    estrategia: config.mostrarEstrategia,
    comparativo: config.mostrarComparativo,
    perfilOperacao: config.mostrarPerfilOperacao,
    evolucaoRendimentos: config.mostrarEvolucaoRendimentos,
    rentabilidadeIndices: config.mostrarRentabilidadeIndices,
  };
}
