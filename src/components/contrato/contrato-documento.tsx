import { formatCPF } from "@/lib/cpf-cnpj";
import { formatMoeda } from "@/lib/format";

export type ContratoDocumentoProps = {
  nome: string;
  email: string;
  cpf: string;
  rg?: string | null;
  nacionalidade?: string | null;
  estadoCivil?: string | null;
  profissao?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  valor: number;
  valorExtenso: string;
  data: Date;
};

function formatDataExtenso(data: Date): { dia: string; mes: string; ano: string } {
  const dia = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", timeZone: "America/Sao_Paulo" }).format(data);
  const mes = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "America/Sao_Paulo" }).format(data);
  const ano = new Intl.DateTimeFormat("pt-BR", { year: "numeric", timeZone: "America/Sao_Paulo" }).format(data);
  return { dia, mes, ano };
}

function Campo({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <p className="mb-1">
      <strong>{label}:</strong> {valor && valor.trim() ? valor : "não informado"}
    </p>
  );
}

export function ContratoDocumento({
  nome,
  email,
  cpf,
  rg,
  nacionalidade,
  estadoCivil,
  profissao,
  telefone,
  endereco,
  valor,
  valorExtenso,
  data,
}: ContratoDocumentoProps) {
  const { dia, mes, ano } = formatDataExtenso(data);

  return (
    <div
      style={{ color: "#1a1a1a", background: "#ffffff", fontFamily: "Georgia, 'Times New Roman', serif" }}
      className="mx-auto max-w-[720px] px-2 py-4 text-[13.5px] leading-relaxed"
    >
      <h1 className="text-center text-lg font-bold uppercase">
        Contrato Particular de Prestação de Serviços de Consultoria e Orientação Financeira
      </h1>
      <p className="mt-1 text-center font-bold">FOCCUS SERVIÇOS COMBINADOS LTDA</p>

      <p className="mt-6">Pelo presente instrumento particular, de um lado:</p>

      <h2 className="mt-5 text-base font-bold">CONTRATADA</h2>
      <p className="mt-2">
        <strong>FOCCUS SERVIÇOS COMBINADOS LTDA</strong>, pessoa jurídica de direito privado,
        inscrita no CNPJ sob nº <strong>66.148.465/0001-00</strong>, com sede na cidade de{" "}
        <strong>Jandira/SP</strong>, doravante denominada simplesmente <strong>CONTRATADA</strong>,
        que prestará seus serviços por meio da plataforma digital denominada{" "}
        <strong>FOCCUS INVEST</strong>.
      </p>

      <p className="mt-4">E, de outro lado:</p>

      <h2 className="mt-5 text-base font-bold">CONTRATANTE</h2>
      <div className="mt-2">
        <Campo label="Nome" valor={nome} />
        <Campo label="E-mail" valor={email} />
        <Campo label="CPF" valor={formatCPF(cpf)} />
        <Campo label="RG" valor={rg} />
        <Campo label="Nacionalidade" valor={nacionalidade} />
        <Campo label="Estado Civil" valor={estadoCivil} />
        <Campo label="Profissão" valor={profissao} />
        <Campo label="Telefone" valor={telefone} />
        <Campo label="Endereço" valor={endereco} />
      </div>
      <p className="mt-2">Doravante denominado simplesmente <strong>CONTRATANTE</strong>.</p>

      <p className="mt-4">
        As partes resolvem celebrar o presente <strong>Contrato de Prestação de Serviços de
        Consultoria e Orientação Financeira</strong>, que será regido pelas cláusulas e condições
        abaixo.
      </p>

      <Secao titulo="CLÁUSULA PRIMEIRA – DO OBJETO">
        <p>
          1.1. O presente contrato tem por objeto a prestação de serviços especializados de
          consultoria, orientação financeira, acompanhamento patrimonial e planejamento
          estratégico financeiro, realizados pela CONTRATADA por meio da plataforma digital{" "}
          <strong>FOCCUS INVEST</strong>.
        </p>
        <p className="mt-2">
          1.2. Os serviços prestados consistem na elaboração de estratégias financeiras,
          acompanhamento de desempenho, gestão operacional das estratégias adotadas e
          disponibilização de informações ao CONTRATANTE por meio da plataforma.
        </p>
        <p className="mt-2">
          1.3. A contratação não constitui sociedade, associação, fundo de investimento ou
          qualquer modalidade de participação societária entre as partes.
        </p>
      </Secao>

      <Secao titulo="CLÁUSULA SEGUNDA – DA CONTRATAÇÃO DOS SERVIÇOS">
        <p className="text-center font-bold">Valor contratado:</p>
        <p className="text-center text-base font-bold">{formatMoeda(valor)}</p>
        <p className="text-center italic">({valorExtenso})</p>
        <p className="mt-3">
          2.1. O valor acima corresponde à contratação dos serviços de consultoria e orientação
          financeira prestados pela CONTRATADA.
        </p>
        <p className="mt-2">
          2.2. O pagamento será realizado mediante transferência bancária, PIX ou outro meio
          disponibilizado pela CONTRATADA.
        </p>
        <p className="mt-2">
          2.3. Após a confirmação do pagamento, o CONTRATANTE terá acesso à plataforma{" "}
          <strong>FOCCUS INVEST</strong>, onde poderá acompanhar seus resultados, histórico,
          movimentações e demais informações relacionadas aos serviços contratados.
        </p>
      </Secao>

      <Secao titulo="CLÁUSULA TERCEIRA – DO PROGRAMA DE PARTICIPAÇÃO NOS RESULTADOS (PLR)">
        <p>
          3.1. Como benefício decorrente dos serviços contratados, a CONTRATADA poderá distribuir
          ao CONTRATANTE valores oriundos do <strong>Programa de Participação nos Lucros e
          Resultados (PLR)</strong>, observando os resultados efetivamente obtidos nas operações
          realizadas.
        </p>
        <p className="mt-2">
          3.2. A distribuição de resultados dependerá exclusivamente do desempenho das estratégias
          adotadas e dos resultados operacionais da CONTRATADA.
        </p>
        <p className="mt-2">3.3. O CONTRATANTE declara ciência de que:</p>
        <ul className="ml-6 mt-1 list-disc">
          <li>não existe promessa de rentabilidade fixa;</li>
          <li>não há garantia de lucro;</li>
          <li>os resultados poderão variar positiva ou negativamente;</li>
          <li>
            eventuais distribuições ocorrerão conforme as políticas internas da plataforma FOCCUS
            INVEST.
          </li>
        </ul>
      </Secao>

      <Secao titulo="CLÁUSULA QUARTA – DO PRAZO DE CUSTÓDIA">
        <p>
          4.1. O valor destinado à execução dos serviços permanecerá vinculado ao contrato pelo
          prazo mínimo de <strong>90 (noventa) dias</strong>, contados da confirmação do
          pagamento.
        </p>
        <p className="mt-2">
          4.2. Após esse período, o CONTRATANTE poderá solicitar o encerramento da contratação e a
          restituição do capital principal, observando o prazo de até{" "}
          <strong>20 (vinte) dias úteis</strong> para processamento.
        </p>
        <p className="mt-2">
          4.3. O prazo poderá ser reduzido apenas mediante autorização expressa da CONTRATADA.
        </p>
      </Secao>

      <Secao titulo="CLÁUSULA QUINTA – DOS SAQUES DOS RESULTADOS">
        <p>
          5.1. Os valores distribuídos através do Programa de Participação nos Lucros e Resultados
          (PLR), quando disponíveis, poderão ser solicitados para saque conforme calendário
          divulgado pela CONTRATADA.
        </p>
        <p className="mt-2">
          5.2. Atualmente, os pedidos de saque são processados <strong>às sextas-feiras</strong>,
          das <strong>08h00 às 18h00 (horário de Brasília)</strong>.
        </p>
        <p className="mt-2">
          5.3. A CONTRATADA poderá alterar o calendário operacional mediante comunicação prévia
          aos usuários da plataforma.
        </p>
      </Secao>

      <Secao titulo="CLÁUSULA SEXTA – DAS OBRIGAÇÕES DA CONTRATADA">
        <p>Constituem obrigações da CONTRATADA:</p>
        <ol className="ml-6 mt-1 list-[upper-roman]">
          <li>prestar os serviços com profissionalismo, diligência e boa-fé;</li>
          <li>disponibilizar acesso à plataforma FOCCUS INVEST;</li>
          <li>manter histórico das movimentações;</li>
          <li>disponibilizar relatórios e informações ao CONTRATANTE;</li>
          <li>processar solicitações dentro dos prazos previstos;</li>
          <li>preservar a confidencialidade dos dados;</li>
          <li>manter equipe de suporte para atendimento ao CONTRATANTE.</li>
        </ol>
      </Secao>

      <Secao titulo="CLÁUSULA SÉTIMA – DAS OBRIGAÇÕES DO CONTRATANTE">
        <p>Constituem obrigações do CONTRATANTE:</p>
        <ol className="ml-6 mt-1 list-[upper-roman]">
          <li>fornecer informações verdadeiras;</li>
          <li>manter seus dados sempre atualizados;</li>
          <li>preservar o sigilo de sua senha de acesso;</li>
          <li>utilizar a plataforma conforme sua finalidade;</li>
          <li>respeitar os prazos estabelecidos neste contrato;</li>
          <li>comunicar imediatamente qualquer acesso não autorizado à sua conta.</li>
        </ol>
      </Secao>

      <Secao titulo="CLÁUSULA OITAVA – DA PLATAFORMA FOCCUS INVEST">
        <p>
          8.1. A plataforma FOCCUS INVEST constitui ferramenta tecnológica destinada à
          disponibilização dos serviços prestados pela CONTRATADA.
        </p>
        <p className="mt-2">
          8.2. Poderão ocorrer interrupções temporárias decorrentes de manutenção, atualizações,
          melhorias ou eventos extraordinários.
        </p>
        <p className="mt-2">
          8.3. A CONTRATADA envidará todos os esforços para manter a plataforma disponível e
          segura.
        </p>
      </Secao>

      <Secao titulo="CLÁUSULA NONA – DA CONFIDENCIALIDADE E PROTEÇÃO DE DADOS">
        <p>
          9.1. As partes comprometem-se a manter absoluto sigilo sobre todas as informações
          obtidas durante a execução deste contrato.
        </p>
        <p className="mt-2">
          9.2. A CONTRATADA tratará os dados pessoais do CONTRATANTE em conformidade com a Lei nº
          13.709/2018 (Lei Geral de Proteção de Dados – LGPD).
        </p>
      </Secao>

      <Secao titulo="CLÁUSULA DÉCIMA – DA RESCISÃO">
        <p>10.1. O presente contrato poderá ser rescindido:</p>
        <ol className="ml-6 mt-1 list-[upper-roman]">
          <li>por comum acordo;</li>
          <li>por descumprimento contratual;</li>
          <li>por solicitação do CONTRATANTE após o término do prazo mínimo de custódia.</li>
        </ol>
        <p className="mt-2">
          10.2. Permanecerão válidas as obrigações pendentes até sua integral liquidação.
        </p>
      </Secao>

      <Secao titulo="CLÁUSULA DÉCIMA PRIMEIRA – DAS DISPOSIÇÕES GERAIS">
        <p>
          11.1. A tolerância de qualquer das partes não importará em renúncia de direitos.
        </p>
        <p className="mt-2">
          11.2. Eventual nulidade de qualquer cláusula não invalidará as demais disposições deste
          contrato.
        </p>
        <p className="mt-2">11.3. Este contrato obriga as partes, seus herdeiros e sucessores.</p>
        <p className="mt-2">
          11.4. O presente instrumento poderá ser assinado eletronicamente, possuindo plena
          validade jurídica.
        </p>
      </Secao>

      <Secao titulo="CLÁUSULA DÉCIMA SEGUNDA – DO FORO">
        <p>
          Fica eleito o foro da Comarca de <strong>Jandira/SP</strong>, com renúncia de qualquer
          outro, por mais privilegiado que seja, para dirimir quaisquer controvérsias oriundas
          deste contrato.
        </p>
      </Secao>

      <p className="mt-8 text-center">
        Jandira/SP, {dia} de {mes} de {ano}.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div className="text-center">
          <p className="border-t border-black pt-1 font-bold">CONTRATADA</p>
          <p className="mt-1">FOCCUS SERVIÇOS COMBINADOS LTDA</p>
          <p>CNPJ: 66.148.465/0001-00</p>
        </div>
        <div className="text-center">
          <p className="border-t border-black pt-1 font-bold">CONTRATANTE</p>
          <p className="mt-1">{nome}</p>
          <p>CPF: {formatCPF(cpf)}</p>
          <p className="mt-2 text-xs">
            Confirmado eletronicamente pelo CONTRATANTE ao ler e aceitar os termos ao contratar
            pela plataforma FOCCUS INVEST.
          </p>
        </div>
      </div>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h2 className="text-sm font-bold">{titulo}</h2>
      <div className="mt-2">{children}</div>
    </div>
  );
}
