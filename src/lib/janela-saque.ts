const FUSO_BRASILIA = "America/Sao_Paulo";
const INICIO_MINUTOS = 8 * 60; // 08:00
const FIM_MINUTOS = 18 * 60 + 30; // 18:30

/** Saque de rendimentos só pode ser solicitado às sextas-feiras, 08h-18h30, horário de Brasília. */
export function janelaSaqueRendimentoAberta(agora: Date = new Date()): boolean {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO_BRASILIA,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(agora);

  const mapa = Object.fromEntries(partes.map((p) => [p.type, p.value]));
  const ehSexta = mapa.weekday === "Fri";
  const minutosDoDia = Number(mapa.hour) * 60 + Number(mapa.minute);

  return ehSexta && minutosDoDia >= INICIO_MINUTOS && minutosDoDia <= FIM_MINUTOS;
}

export const MENSAGEM_JANELA_FECHADA =
  "Os pedidos de saque de rendimentos ficam disponíveis às sextas-feiras, das 08h às 18h30, no horário oficial de Brasília.";
