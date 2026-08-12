import { PainelDashboard } from "@/components/painel/dashboard";
import { ultimasSextas } from "@/lib/datas";
import { janelaSaqueRendimentoAberta } from "@/lib/janela-saque";

export default function PreviewPainelPage() {
  const sextas = ultimasSextas(8);
  const valores = [42.1, 38.5, 51.2, 47.8, 60.3, 55.9, 64.1, 71.42];

  return (
    <PainelDashboard
      usuario={{
        primeiroNome: "Waldir",
        statusCadastro: "APROVADO",
        codigoIndicacao: "7K2QX-WALDIR",
        moeda: "BRL",
      }}
      resumo={{
        capitalPrincipal: 4506.17,
        capitalCarencia: 1200,
        capitalDisponivel: 31.99,
        distribuicoesAcumuladas: valores.reduce((a, b) => a + b, 0),
        distribuicoesDisponiveis: 71.42,
        bonusIndicacao: 0,
        incentivoLiderancaAcumulado: 0,
        valoresReaplicados: 0,
        valoresEmProcessamento: 0,
        saquesPendentes: 0,
        aportesEmAnalise: 0,
        totalDoacoes: 0,
        rentabilidadePeriodo: 1.6,
        proximaLiberacao: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        historicoRendimentos: sextas.map((data, i) => ({ data, valor: valores[i] })),
      }}
      janelaSaqueRendimentoAberta={janelaSaqueRendimentoAberta()}
    />
  );
}
