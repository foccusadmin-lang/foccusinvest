import Link from "next/link";
import { Logo } from "@/components/logo";
import { EntidadesLista, type EntidadeCard } from "@/app/painel/doar/entidades-lista";

const entidades: EntidadeCard[] = [
  {
    id: "e1",
    nome: "Ministério Apostólico Refrigério",
    tipo: "Igreja",
    cnpj: "17847125000154",
    cidade: "Jandira",
    estado: "SP",
    descricao: "Assistência social e apoio a famílias em situação de vulnerabilidade.",
    logoUrl: null,
    podeReceberDoacao: true,
    podeReceberAplicacao: true,
  },
  {
    id: "e2",
    nome: "Instituto Mãos que Ajudam",
    tipo: "ONG",
    cnpj: "12345678000199",
    cidade: "São Paulo",
    estado: "SP",
    descricao: "Educação e capacitação profissional para jovens de baixa renda.",
    logoUrl: null,
    podeReceberDoacao: true,
    podeReceberAplicacao: false,
  },
];

export default function PreviewPainelDoarPage() {
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
        <h1 className="text-2xl font-bold text-foreground">Doar para uma entidade</h1>
        <p className="mt-1 text-sm text-muted">
          Escolha uma entidade habilitada e doe usando seu saldo disponível ou uma nova aplicação
          via Pix.
        </p>
        <div className="mt-6">
          <EntidadesLista entidades={entidades} saldoDisponivel={192.42} />
        </div>
      </main>
    </div>
  );
}
