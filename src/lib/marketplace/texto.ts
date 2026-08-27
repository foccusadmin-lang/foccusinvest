/** Normaliza texto pra comparação tolerante a acento/caixa — usado tanto pra validar a cidade
 *  atendida quanto pra gerar slug de bairro. Sem isso "Jandira" e "jandira", ou "Novo Horizonte"
 *  e "novo horizonte", seriam tratados como coisas diferentes. */
export function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
