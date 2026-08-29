/** Meio-dia (horário de Brasília) do dia 1 do mês corrente — usado como corte pra "rentabilidade
 *  do período", pra não depender do fuso do servidor. */
export function inicioDoMesBrasilia(): Date {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const ano = partes.find((p) => p.type === "year")!.value;
  const mes = partes.find((p) => p.type === "month")!.value;
  return new Date(`${ano}-${mes}-01T00:00:00-03:00`);
}

/** Próxima sexta-feira (no horário de Brasília) a partir de agora — usada como data programada
 *  de pagamento das solicitações de saque. Se hoje já for sexta, `pagarNaMesmaSexta` decide se
 *  conta a de hoje ou empurra pra semana seguinte (regra configurável pelo admin — ver
 *  ConfiguracaoSistema.saquePagaMesmaSexta). Data devolvida ao meio-dia (evita que o dia
 *  "escorregue" por causa de fuso horário ao comparar/exibir depois). */
export function proximaSextaPagamento(pagarNaMesmaSexta: boolean, agora: Date = new Date()): Date {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(agora);
  const mapa = Object.fromEntries(partes.map((p) => [p.type, p.value]));
  const hojeBrasilia = new Date(`${mapa.year}-${mapa.month}-${mapa.day}T12:00:00-03:00`);
  const ehSexta = mapa.weekday === "Fri";

  let diasAteSexta: number;
  if (ehSexta) {
    diasAteSexta = pagarNaMesmaSexta ? 0 : 7;
  } else {
    const diaSemanaNum = hojeBrasilia.getUTCDay(); // 0=domingo ... 6=sábado
    diasAteSexta = (5 - diaSemanaNum + 7) % 7 || 7;
  }

  const resultado = new Date(hojeBrasilia);
  resultado.setUTCDate(resultado.getUTCDate() + diasAteSexta);
  return resultado;
}

export function ultimasSextas(quantidade: number): Date[] {
  const hoje = new Date();
  const diaSemana = hoje.getDay();
  const diasDesdeSexta = (diaSemana - 5 + 7) % 7;
  const ultimaSexta = new Date(hoje);
  ultimaSexta.setHours(0, 0, 0, 0);
  ultimaSexta.setDate(hoje.getDate() - diasDesdeSexta);

  return Array.from({ length: quantidade }, (_, i) => {
    const data = new Date(ultimaSexta);
    data.setDate(ultimaSexta.getDate() - (quantidade - 1 - i) * 7);
    return data;
  });
}
