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
        modoBonusIndicacao: "MANUAL",
      }}
      resumo={{
        capitalPrincipal: 4506.17,
        capitalCarencia: 1200,
        capitalDisponivel: 31.99,
        distribuicoesAcumuladas: valores.reduce((a, b) => a + b, 0),
        distribuicoesDisponiveis: 71.42,
        bonusIndicacao: 0,
        incentivoLiderancaAcumulado: 0,
        incentivoLiderancaDisponivel: 0,
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
      vitrineOperacao={{
        nome: "Estratégia WEM",
        moedas: "USD, EUR, XAU (Ouro)",
        ativa: true,
        esperadoMin: 1.5,
        esperadoMax: 4.0,
        acumulado: 4.57,
        ontem: 0.2,
        serieComparativo: [
          "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06",
          "2026-08-07", "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13",
          "2026-08-14", "2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20",
        ].map((data, i) => ({
          data,
          acumulado: [0.2, 0.4, 0.6, 0.9, 1.1, 1.4, 1.7, 2.0, 2.3, 3.4, 3.7, 4.0, 4.3, 4.5, 4.57][i],
        })),
      }}
    />
  );
}
