export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-foreground">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-gold-gradient">
        Política de Privacidade
      </h1>
      <p className="mt-4 text-sm text-muted">
        Versão 0.1 — documento provisório, pendente de validação jurídica.
      </p>

      <div className="mt-8 space-y-4 text-sm leading-relaxed text-foreground/90">
        <p>
          Coletamos os dados necessários para o seu cadastro (nome, CPF ou
          CNPJ, e-mail, telefone e documentos), utilizados exclusivamente para
          verificação de identidade, prevenção a fraude e cumprimento de
          obrigações legais.
        </p>
        <p>
          CPF, CNPJ, documentos e dados bancários são acessados apenas por
          pessoas autorizadas que necessitem dessas informações para exercer
          suas funções.
        </p>
        <p>
          Este texto é um placeholder técnico para fins de desenvolvimento e
          será substituído pelo conteúdo definitivo após aprovação jurídica.
        </p>
      </div>
    </div>
  );
}
