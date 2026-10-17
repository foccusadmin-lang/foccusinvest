/** Onde a Foccus opera — texto institucional exibido no demonstrativo do painel do investidor. */
export const LOCAL_OPERACAO = {
  mercado: "Mercado Forex",
  corretora: "Corretora EBC",
  conta: "Foccus Serviços Combinados LTDA",
};

export type CodigoPerfil = "CONSERVADOR" | "MODERADO" | "AGRESSIVO" | "SUPERAGRESSIVO";

export type PerfilOperacao = {
  codigo: CodigoPerfil;
  nome: string;
  icone: string;
  risco: string;
  /** Faixa de retorno diário em texto, como definido pela Foccus. */
  faixa: string;
  corNome: string;
  /** Limite superior da faixa (inclusivo), em % ao dia. */
  ate: number;
};

/** Classificação dos perfis (retorno diário → nível de risco), exatamente como definida pela
 *  Foccus: Conservador 0% até 0,25% · Moderado acima de 0,25% até 0,50% · Agressivo/arrojado acima
 *  de 0,50% até 0,75% · Superagressivo/muito arrojado acima de 0,75% até 1,00%. */
export const PERFIS_OPERACAO: PerfilOperacao[] = [
  { codigo: "CONSERVADOR", nome: "Conservador", icone: "🛡️", risco: "Baixo", faixa: "0% a 0,25%", corNome: "Azul", ate: 0.25 },
  { codigo: "MODERADO", nome: "Moderado", icone: "⚖️", risco: "Médio", faixa: "0,25% a 0,50%", corNome: "Verde", ate: 0.5 },
  { codigo: "AGRESSIVO", nome: "Agressivo ou arrojado", icone: "⚡", risco: "Alto", faixa: "0,50% a 0,75%", corNome: "Laranja", ate: 0.75 },
  { codigo: "SUPERAGRESSIVO", nome: "Superagressivo ou muito arrojado", icone: "🔥", risco: "Muito alto", faixa: "0,75% a 1,00%", corNome: "Vermelho", ate: Infinity },
];

/** Perfil em que a operação do dia se enquadra. A comparação é feita com 2 casas decimais (a
 *  precisão com que o percentual é lançado e exibido): 0,25% exato ainda é Conservador, 0,26% já é
 *  Moderado. Retornos negativos ou acima de 1,00% ficam no primeiro/último perfil. */
export function classificarPerfil(retornoDiario: number): PerfilOperacao {
  const valor = Math.round(retornoDiario * 100) / 100;
  return PERFIS_OPERACAO.find((p) => valor <= p.ate) ?? PERFIS_OPERACAO[PERFIS_OPERACAO.length - 1];
}
