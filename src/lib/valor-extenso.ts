const UNIDADES = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const DEZ_A_DEZENOVE = [
  "dez", "onze", "doze", "treze", "quatorze", "quinze",
  "dezesseis", "dezessete", "dezoito", "dezenove",
];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = [
  "", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos",
  "seiscentos", "setecentos", "oitocentos", "novecentos",
];

function tresDigitos(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";

  const centena = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];

  if (centena > 0) partes.push(CENTENAS[centena]);

  if (resto > 0) {
    let restoTexto: string;
    if (resto < 10) restoTexto = UNIDADES[resto];
    else if (resto < 20) restoTexto = DEZ_A_DEZENOVE[resto - 10];
    else {
      const dezena = Math.floor(resto / 10);
      const unidade = resto % 10;
      restoTexto = unidade === 0 ? DEZENAS[dezena] : `${DEZENAS[dezena]} e ${UNIDADES[unidade]}`;
    }
    partes.push(centena > 0 ? `e ${restoTexto}` : restoTexto);
  }

  return partes.join(" ");
}

function numeroPorExtenso(n: number): string {
  if (n === 0) return "zero";

  const milhoes = Math.floor(n / 1_000_000);
  const milhares = Math.floor((n % 1_000_000) / 1000);
  const unidades = n % 1000;

  const partes: string[] = [];
  if (milhoes > 0) {
    partes.push(milhoes === 1 ? "um milhão" : `${tresDigitos(milhoes)} milhões`);
  }
  if (milhares > 0) {
    partes.push(milhares === 1 ? "mil" : `${tresDigitos(milhares)} mil`);
  }
  if (unidades > 0) {
    partes.push(tresDigitos(unidades));
  }

  if (partes.length === 1) return partes[0];

  const ultima = partes[partes.length - 1];
  const anteriores = partes.slice(0, -1);
  const usaE = unidades > 0 && (unidades < 100 || unidades % 100 === 0);

  return `${anteriores.join(", ")}${usaE ? " e " : " "}${ultima}`;
}

export function valorPorExtenso(valor: number): string {
  const reais = Math.floor(Math.abs(valor));
  const centavos = Math.round((Math.abs(valor) - reais) * 100);

  const reaisTexto = reais > 0 ? `${numeroPorExtenso(reais)} ${reais === 1 ? "real" : "reais"}` : "";
  const centavosTexto =
    centavos > 0 ? `${numeroPorExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}` : "";

  let texto: string;
  if (reaisTexto && centavosTexto) texto = `${reaisTexto} e ${centavosTexto}`;
  else if (reaisTexto) texto = reaisTexto;
  else if (centavosTexto) texto = centavosTexto;
  else texto = "zero reais";

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
