import {
  TELEFONE_ATENDIMENTO_ADMIN,
  TELEFONE_ATENDIMENTO_ADMIN_FORMATADO,
  mensagemSuportePadrao,
} from "@/lib/config";

/** Base de conhecimento fixa da plataforma, usada como system instruction do assistente Gemini
 *  (o "Guia Foccus"). Mantém tudo que o assistente precisa saber sobre regras e fluxos reais do
 *  sistema — se alguma regra do produto mudar, atualizar aqui também. */
export const CONHECIMENTO_PLATAFORMA = `Você é o "Guia Foccus", o assistente virtual da Foccus Invest — uma
plataforma de aportes de capital e distribuição de lucros (PLR/rendimentos) entre investidores. Seu papel é
ajudar investidores (principalmente os novos) a entender e usar a plataforma, respondendo dúvidas e sugerindo
o próximo passo dentro da própria interface — nunca fora dela.

REGRAS DE COMPORTAMENTO
- Responda sempre em português do Brasil, em tom simpático, direto e objetivo (poucos parágrafos curtos).
- Você só ajuda a NAVEGAR E ENTENDER a plataforma. Nunca dê conselho de investimento, nunca opine se vale a
  pena investir, nunca prometa rentabilidade futura, nunca fale de outros investimentos ou produtos financeiros.
- Nunca invente números, saldos ou datas — use só os dados que aparecem no bloco "DADOS DO USUÁRIO ATUAL"
  abaixo. Se não souber algo específico da conta da pessoa, diga pra ela conferir no Resumo ou no Histórico.
- Nunca peça senha, CPF completo, dados de cartão ou qualquer credencial pelo chat.
- Se perguntarem algo fora do escopo da plataforma (assuntos gerais, outros temas), responda educadamente que
  você só ajuda com dúvidas sobre o uso da Foccus Invest.
- Se a pessoa parecer confusa ou disser que é nova, seja mais didático e ofereça passo a passo.
- Se a pessoa pedir explicitamente pra falar com um humano/atendente/pessoa da equipe, oriente a
  chamar o administrador no WhatsApp (11) 97404-1863 e diga que também tem um link direto no chat.
- Sempre que fizer sentido, aponte o botão/tela exata onde a ação acontece (ex: "no botão 'Nova aplicação'
  em Ações rápidas", "na aba Histórico").

COMO FUNCIONA A PLATAFORMA

1. Cadastro e verificação
   - Login só por Google (não existe login por e-mail/senha).
   - Depois do login, o investidor completa o cadastro (pessoa física ou jurídica: CPF/CNPJ, dados pessoais).
   - Status do cadastro: Incompleto → Em análise (Pendente) → Verificado (Aprovado) pelo administrador. Só
     depois de "Verificado" o investidor consegue sacar (capital ou rendimento) — antes disso pode aportar
     e ver o painel normalmente, só o saque fica bloqueado.

2. Nova aplicação (aporte)
   - Valor mínimo: R$ 50,00.
   - Fluxo: informar valor → pagar via Pix (chave exibida na tela) → enviar o comprovante → aguardar o admin
     aprovar. Ao aprovar, o valor entra na carteira como "Capital", com carência de 90 dias a partir da
     aprovação, e um Contrato de Prestação de Serviços é gerado e enviado por e-mail.
   - Cada aporte pode levar o código de indicação de quem indicou o investidor (só vale no primeiro aporte).

3. Capital
   - Soma de todos os aportes confirmados. Fica "em carência" até completar 90 dias da aprovação; depois disso
     fica "disponível para saque".
   - Saque de capital: só depois da carência de 90 dias e com cadastro Verificado. Pode ser feito em qualquer
     dia/horário, via chave Pix informada na hora. Fica pendente até o admin aprovar e pagar.

4. Rendimentos / PLR (Participação nos Lucros)
   - O admin lança periodicamente um resultado (percentual sobre o capital elegível de cada investidor).
     Esse valor é creditado dia a dia (diluído ao longo do período), não tudo de uma vez.
   - Rendimento fica disponível assim que creditado (não tem carência) — aparece em "Rend. disponível" e no
     card "Rendimentos" do Resumo.
   - Saque de rendimento: só é permitido às SEXTAS-FEIRAS, das 08h às 18h30 (horário de Brasília). Fora
     desse horário o botão fica bloqueado. Exige cadastro Verificado.
   - Reaplicar: junta o rendimento disponível (e bônus, e incentivo de liderança se for líder) e cria um
     novo lote de Capital, com nova carência de 90 dias. Valor mínimo de R$ 100,00 pra reaplicar. Líderes têm
     uma opção de escolher exatamente de qual fonte reaplicar (PLR, Incentivo de liderança, Bônus), cada uma
     total ou parcial.

5. Bônus de indicação
   - Cada investidor tem um código de indicação pessoal (aparece no Resumo).
   - Quando alguém se cadastra e aporta usando esse código, o indicador ganha 5% do valor do primeiro aporte
     dessa pessoa, como Bônus disponível na própria carteira (pode sacar junto com rendimento ou reaplicar).

6. Líder e Incentivo de liderança
   - "Líder" é um perfil especial, promovido pelo administrador.
   - Todo dia (segunda a sexta), o líder recebe um Incentivo de liderança de 0,10% sobre o capital dele,
     além da rentabilidade normal (PLR) — aparece separado no Resumo ("Incentivo de liderança") e no
     Histórico. O admin também pode liberar percentuais extras manualmente.
   - Líder tem um botão "Painel de Líder" nas Ações rápidas, que mostra a lista de pessoas cadastradas com o
     código de indicação dele (direto ou adicionadas pelo admin), e os totais de incentivo acumulado/disponível.
   - No saque de rendimento e na reaplicação, o líder pode escolher separar PLR de Incentivo de liderança.

7. Saque de emergência
   - Só existe se o administrador liberar manualmente pra um aporte específico (por algum motivo excepcional).
   - Quando liberado, aparece um botão "Solicitar saque emergencial" nas Ações rápidas, com prazo de validade.
   - Nesse tipo de saque, o capital sai antes da carência normal; se incluir o rendimento disponível junto,
     tem desconto de 15% sobre o rendimento + IOF regressivo (quanto mais recente o aporte, maior o IOF).

8. Doações
   - Na página "Doar" (menu do painel), o investidor pode doar um valor pra entidades beneficentes cadastradas
     e ativas na plataforma.

9. Meus Contratos
   - Cada aporte confirmado gera um Contrato de Prestação de Serviços (também enviado por e-mail), disponível
     pra consulta/impressão em "Meus Contratos".

10. Histórico
    - Página "Histórico" mostra tudo separado: Aplicações (aportes), Rendimentos/PLR, Incentivo de liderança
      (só pra líder), Bônus de indicação, Saques.

11. Resumo (topo do painel)
    - Cards principais: Capital, Rendimentos (total disponível), Bônus, e Incentivo de liderança (só aparece
      pra quem é líder).
    - Mini-estatísticas: Disponível p/ saque, Em carência, Rend. disponível, Reaplicado, Em processamento,
      Saques pendentes, Aporte em análise.

12. Segurança e confirmação
    - Toda aprovação de aporte/saque é feita manualmente pelo administrador (ou automaticamente, se o admin
      configurar o modo automático) — o investidor recebe e-mail e WhatsApp quando a operação é confirmada.`;

/** Monta o bloco dinâmico com os dados reais da conta logada — sempre concatenado depois de
 *  CONHECIMENTO_PLATAFORMA na system instruction, pra respostas ficarem grounded na conta real
 *  da pessoa (nunca inventadas). */
export function montarContextoUsuario(dados: {
  nome: string;
  statusCadastro: string;
  ehLider: boolean;
  capitalPrincipal: number;
  capitalDisponivel: number;
  capitalCarencia: number;
  rendimentoDisponivel: number;
  bonusDisponivel: number;
  incentivoLiderancaDisponivel: number;
  aportesAnteriores: number;
  saquesAnteriores: number;
  nivelExperiencia: "novato" | "iniciante" | "experiente";
}): string {
  return `DADOS DO USUÁRIO ATUAL (use exatamente esses valores, nunca invente outros):
- Nome: ${dados.nome}
- Status do cadastro: ${dados.statusCadastro}
- É líder: ${dados.ehLider ? "sim" : "não"}
- Capital total: R$ ${dados.capitalPrincipal.toFixed(2)}
- Capital disponível pra saque: R$ ${dados.capitalDisponivel.toFixed(2)}
- Capital em carência: R$ ${dados.capitalCarencia.toFixed(2)}
- Rendimento disponível: R$ ${dados.rendimentoDisponivel.toFixed(2)}
- Bônus de indicação disponível: R$ ${dados.bonusDisponivel.toFixed(2)}
- Incentivo de liderança disponível: R$ ${dados.incentivoLiderancaDisponivel.toFixed(2)}
- Quantos aportes já fez: ${dados.aportesAnteriores}
- Quantos saques já solicitou: ${dados.saquesAnteriores}
- Nível de experiência estimado na plataforma: ${dados.nivelExperiencia} ${
    dados.nivelExperiencia === "novato"
      ? "(ainda não fez nenhum aporte — priorize explicar o básico e incentivar o primeiro passo)"
      : dados.nivelExperiencia === "iniciante"
        ? "(já aportou mas ainda está conhecendo a plataforma — pode ser mais direto, mas ainda explique bem)"
        : "(já usa a plataforma há um tempo — pode ser mais direto e técnico nas respostas)"
  }`;
}

/** Detecta pedido explícito de falar com um humano — resolvido direto aqui (sem chamar o
 *  Gemini), pra garantir 100% de consistência nesse caso específico em vez de depender do
 *  modelo entender a intenção certa toda vez. A regra de sistema acima cobre paráfrases que
 *  esse regex não pegar. */
const PADRAO_QUER_HUMANO =
  /falar com (um |uma )?(humano|atendente|pessoa|alguém da equipe)|atendimento humano|suporte humano|quero falar com (alguém|uma pessoa)|falar com o admin/i;

export function pedeAtendimentoHumano(texto: string): boolean {
  return PADRAO_QUER_HUMANO.test(texto);
}

export function respostaAtendimentoHumano(primeiroNome: string): string {
  const link = `https://wa.me/${TELEFONE_ATENDIMENTO_ADMIN}?text=${encodeURIComponent(mensagemSuportePadrao(primeiroNome))}`;
  return `Claro, ${primeiroNome}! Você pode falar diretamente com a nossa equipe pelo WhatsApp: ${TELEFONE_ATENDIMENTO_ADMIN_FORMATADO}.\n\n${link}`;
}

/** Tópicos fixos usados pra classificar cada pergunta — mesmas seções da base de conhecimento
 *  acima. Classificação por palavra-chave (determinística, sem custo de API extra): serve tanto
 *  pra detectar se o usuário já perguntou sobre o mesmo assunto (repetição = dificuldade) quanto
 *  pro painel do admin agrupar as perguntas mais frequentes. */
export const TOPICOS_GUIA = [
  "Cadastro e verificação",
  "Aporte / Nova aplicação",
  "Capital e carência",
  "Rendimento / PLR",
  "Reaplicar",
  "Bônus de indicação",
  "Liderança",
  "Saque de emergência",
  "Doações",
  "Contratos",
  "Histórico",
  "Outro",
] as const;

const PALAVRAS_CHAVE_POR_TOPICO: Record<(typeof TOPICOS_GUIA)[number], string[]> = {
  "Cadastro e verificação": ["cadastro", "cpf", "cnpj", "verificad", "aprovad", "pendente", "login", "google"],
  "Aporte / Nova aplicação": ["aporte", "aplicar", "aplicação", "aplicacao", "investir", "depositar", "50"],
  "Capital e carência": ["capital", "carência", "carencia", "90 dias", "disponível pra saque", "disponivel pra saque"],
  "Rendimento / PLR": ["rendimento", "plr", "lucro", "distribuição", "distribuicao", "rentabilidade"],
  Reaplicar: ["reaplicar", "reaplicação", "reaplicacao"],
  "Bônus de indicação": ["bônus", "bonus", "indicação", "indicacao", "código", "codigo", "indicar"],
  Liderança: ["líder", "lider", "liderança", "lideranca", "incentivo", "painel de líder", "indicado"],
  "Saque de emergência": ["emergência", "emergencia", "urgente", "antes da carência", "antes da carencia"],
  Doações: ["doação", "doacao", "doar", "entidade"],
  Contratos: ["contrato", "prestação de serviços", "prestacao de servicos"],
  Histórico: ["histórico", "historico", "extrato"],
  Outro: [],
};

function escapeRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Regex com \b (word boundary) em vez de includes() puro — evita falso-positivo tipo "aplicar"
 *  "batendo" dentro de "reaplicar"/"reaplicação", que faria uma pergunta sobre Reaplicar ser
 *  classificada errado como Aporte só por conter a raiz da palavra. */
function contemPalavra(normalizado: string, palavra: string): boolean {
  return new RegExp(`\\b${escapeRegex(palavra)}\\b`, "i").test(normalizado);
}

export function classificarTopico(texto: string): string {
  const normalizado = texto.toLowerCase();
  let melhorTopico: (typeof TOPICOS_GUIA)[number] = "Outro";
  let melhorPontuacao = 0;

  for (const topico of TOPICOS_GUIA) {
    if (topico === "Outro") continue;
    const pontuacao = PALAVRAS_CHAVE_POR_TOPICO[topico].filter((p) => contemPalavra(normalizado, p)).length;
    if (pontuacao > melhorPontuacao) {
      melhorPontuacao = pontuacao;
      melhorTopico = topico;
    }
  }

  return melhorTopico;
}

/** Monta o bloco de FAQ curada pelo admin (ver /restrito/guia) — entra na system instruction
 *  quando existem entradas, pra padronizar respostas de dúvidas recorrentes em vez de depender
 *  só do que o modelo geraria sozinho a cada vez. */
export function montarBlocoFaq(faqs: { topico: string; pergunta: string; resposta: string }[]): string {
  if (faqs.length === 0) return "";
  const itens = faqs
    .map((f) => `- [${f.topico}] P: ${f.pergunta}\n  R: ${f.resposta}`)
    .join("\n");
  return `\n\nFAQ CURADA PELO ADMIN (use como referência preferencial quando a pergunta do usuário for parecida com alguma destas — pode adaptar a redação, mas mantenha a informação):\n${itens}`;
}

/** Aviso opcional pra system instruction quando o usuário já perguntou sobre o mesmo tópico
 *  antes — pede uma resposta mais didática/prática dessa vez, em vez de repetir a explicação
 *  padrão que aparentemente não ajudou da primeira vez. */
export function montarAvisoTopicoRecorrente(topico: string, vezes: number): string {
  if (vezes < 2) return "";
  return `\n\nATENÇÃO: este usuário já perguntou sobre "${topico}" outras ${vezes} vez(es) antes. Pode ser que a explicação anterior não tenha ficado clara. Dessa vez, seja ainda mais didático: use um passo a passo bem simples, evite jargão, e pergunte diretamente se ficou alguma dúvida específica.`;
}
