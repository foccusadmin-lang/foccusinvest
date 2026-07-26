export default function TermosPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-foreground">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-gold-gradient">
        Termos de Uso
      </h1>
      <p className="mt-4 text-sm text-muted">
        Versão 0.1 — documento provisório, pendente de validação jurídica.
      </p>

      <div className="mt-8 space-y-4 text-sm leading-relaxed text-foreground/90">
        <p>
          A Foccus Invest é uma plataforma de gestão de aportes e distribuição
          variável de resultados empresariais. A participação envolve riscos,
          e a rentabilidade é variável — não podendo ser apresentada como
          garantida.
        </p>
        <p>
          Resultados anteriores não garantem resultados futuros. Toda
          distribuição estará vinculada a resultados empresariais
          comprováveis, com documentos, período de apuração e memória de
          cálculo disponíveis ao usuário.
        </p>
        <p>
          Este texto é um placeholder técnico para fins de desenvolvimento e
          será substituído pelo conteúdo definitivo após aprovação jurídica.
        </p>
      </div>
    </div>
  );
}
