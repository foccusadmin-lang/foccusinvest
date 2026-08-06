import Link from "next/link";
import { Logo } from "@/components/logo";
import { IconVerified } from "@/components/icons";
import { DadosPessoaisForm } from "@/app/painel/configuracoes/dados-form";

export default function PreviewPainelConfiguracoesPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/80 bg-ink/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo size={30} />
          <Link href="/painel" className="text-sm text-muted hover:text-gold-light">
            Voltar ao painel
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="mt-1 text-sm text-muted">Dados do seu cadastro.</p>

        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-border bg-surface p-4">
          <IconVerified width={20} height={20} />
          <div>
            <p className="text-sm font-semibold text-emerald-300">Cadastro verificado</p>
            <p className="text-xs text-muted">Você já pode solicitar saques.</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
          <DadosPessoaisForm
            email="waldir.custodio@exemplo.com"
            telefone="(11) 97720-2948"
            endereco="Rua Juvenal Faustino de Melo, 300 - Jandira - SP"
            nome="Waldir Rodrigues Custódio da Silva"
            labelNome="Nome completo"
            tipoPessoa="FISICA"
            cpf="52998224725"
            dataNascimento="1985-04-12"
            cnpj=""
            representanteLegal=""
            cpfRepresentante=""
          />
        </div>
      </main>
    </div>
  );
}
