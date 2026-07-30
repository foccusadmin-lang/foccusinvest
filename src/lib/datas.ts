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
