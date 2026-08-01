import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/logo";
import { maskCPF, maskCNPJ } from "@/lib/cpf-cnpj";
import { formatData } from "@/lib/format";
import { IconVerified } from "@/components/icons";
import { DadosPessoaisForm } from "./dados-form";

export default async function ConfiguracoesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { pessoaFisica: true, pessoaJuridica: true },
  });
  if (!user) redirect("/login");

  const verificado = user.statusCadastro === "APROVADO";

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
          {verificado ? (
            <>
              <IconVerified width={20} height={20} />
              <div>
                <p className="text-sm font-semibold text-emerald-300">Cadastro verificado</p>
                <p className="text-xs text-muted">Você já pode solicitar saques.</p>
              </div>
            </>
          ) : (
            <div>
              <p className="text-sm font-semibold text-amber-300">
                {user.statusCadastro === "PENDENTE"
                  ? "Cadastro em análise"
                  : "Cadastro incompleto"}
              </p>
              <p className="text-xs text-muted">
                {user.statusCadastro === "PENDENTE"
                  ? "Um administrador vai revisar seus dados em breve. Saques ficam disponíveis após a verificação."
                  : "Complete seu cadastro para liberar todas as funções."}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
          {user.pessoaFisica ? (
            <dl className="space-y-4">
              <Campo label="Nome completo" valor={user.pessoaFisica.nomeCompleto} />
              <Campo label="CPF" valor={maskCPF(user.pessoaFisica.cpf)} />
              <Campo
                label="Data de nascimento"
                valor={formatData(user.pessoaFisica.dataNascimento)}
              />
              <Campo label="E-mail" valor={user.email} />
              {user.pessoaFisica.telefone && (
                <Campo label="Telefone" valor={user.pessoaFisica.telefone} />
              )}
            </dl>
          ) : user.pessoaJuridica ? (
            <dl className="space-y-4">
              <Campo label="Razão social" valor={user.pessoaJuridica.razaoSocial} />
              <Campo label="CNPJ" valor={maskCNPJ(user.pessoaJuridica.cnpj)} />
              <Campo
                label="Representante legal"
                valor={user.pessoaJuridica.representanteLegal}
              />
              <Campo label="E-mail" valor={user.email} />
              {user.pessoaJuridica.telefone && (
                <Campo label="Telefone" valor={user.pessoaJuridica.telefone} />
              )}
            </dl>
          ) : null}

          {(user.pessoaFisica || user.pessoaJuridica) && (
            <DadosPessoaisForm
              email={user.email}
              telefone={user.pessoaFisica?.telefone ?? user.pessoaJuridica?.telefone ?? ""}
              endereco={user.pessoaFisica?.endereco ?? user.pessoaJuridica?.endereco ?? ""}
              nome={user.pessoaFisica?.nomeCompleto ?? user.pessoaJuridica?.razaoSocial ?? ""}
              labelNome={user.pessoaFisica ? "Nome completo" : "Razão social"}
              tipoPessoa={user.pessoaFisica ? "FISICA" : "JURIDICA"}
              cpf={user.pessoaFisica?.cpf ?? ""}
              dataNascimento={
                user.pessoaFisica ? user.pessoaFisica.dataNascimento.toISOString().slice(0, 10) : ""
              }
              cnpj={user.pessoaJuridica?.cnpj ?? ""}
              representanteLegal={user.pessoaJuridica?.representanteLegal ?? ""}
              cpfRepresentante={user.pessoaJuridica?.cpfRepresentante ?? ""}
            />
          )}

          {!user.pessoaFisica && !user.pessoaJuridica && (
            <p className="text-sm text-muted">
              Você ainda não completou seu cadastro.{" "}
              <Link href="/onboarding/cadastro" className="text-gold-light underline">
                Completar agora
              </Link>
            </p>
          )}
        </div>

        <Link
          href="/painel/contratos"
          className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-surface p-4 transition hover:border-gold/40"
        >
          <div>
            <p className="text-sm font-semibold text-foreground">Meus contratos</p>
            <p className="text-xs text-muted">
              Veja e imprima os contratos de prestação de serviços das suas aplicações.
            </p>
          </div>
          <span className="text-gold-light">→</span>
        </Link>
      </main>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/50 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-xs uppercase tracking-wider text-muted">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{valor}</dd>
    </div>
  );
}
