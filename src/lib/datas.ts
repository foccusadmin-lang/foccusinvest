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
