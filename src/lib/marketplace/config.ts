import { normalizarTexto } from "./texto";

/**
 * Configuração regional do marketplace (Foccus Serviços) — MVP restrito a uma única cidade.
 * Lida de env pra poder trocar de cidade num deploy futuro sem alterar código (ver seção 21 do
 * spec: hoje só Jandira fica ativa, outras cidades da região entram depois).
 */
export const MARKETPLACE_CITY = process.env.NEXT_PUBLIC_APP_CITY?.trim() || "Jandira";
export const MARKETPLACE_STATE = process.env.NEXT_PUBLIC_APP_STATE?.trim() || "SP";
export const MARKETPLACE_COUNTRY = process.env.NEXT_PUBLIC_APP_COUNTRY?.trim() || "BR";

export const MARKETPLACE_REGIAO_LABEL = `${MARKETPLACE_CITY} - ${MARKETPLACE_STATE}`;

export const MARKETPLACE_FORA_DA_REGIAO_MSG = `Este aplicativo está disponível atualmente apenas em ${MARKETPLACE_REGIAO_LABEL}.`;

/**
 * Confere se uma cidade está dentro da área atendida pelo marketplace. Comparação simples e
 * tolerante a acentuação/caixa — é a mesma checagem usada no cadastro do prestador e na
 * validação de qualquer localização recebida do cliente. NUNCA confiar só na checagem do
 * frontend: todo fluxo que grava cidade (perfil de prestador, solicitação de serviço) deve
 * chamar isso no backend antes de salvar.
 */
export function cidadeAtendida(cidade: string | null | undefined): boolean {
  if (!cidade) return false;
  return normalizarTexto(cidade) === normalizarTexto(MARKETPLACE_CITY);
}
