const FUSO_BRASILIA = "America/Sao_Paulo";
const INICIO_MINUTOS = 7 * 60; // 07:00
const FIM_MINUTOS = 18 * 60 + 30; // 18:30

/** Saque no autoatendimento (Capital ou Rendimento) só pode ser SOLICITADO às sextas-feiras,
 *  07h-18h30, horário de Brasília — vale pros botões e endpoints normais de saque. Fora dessa
 *  janela: o saque de emergência (com liberação especial do admin) continua liberado, porque
 *  existe justamente pra contornar restrições normais; e o saque assistido feito pelo próprio
 *  admin (restrito/usuarios) também continua liberado a qualquer hora, de propósito — ajuda quem
 *  tem dificuldade de sacar sozinho, inclusive fora da janela. */
export function janelaSaqueAberta(agora: Date = new Date()): boolean {
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
  "Os pedidos de saque ficam disponíveis às sextas-feiras, das 07h às 18h30, no horário oficial de Brasília.";
