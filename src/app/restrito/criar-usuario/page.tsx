import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CriarUsuarioForm } from "./criar-usuario-form";

export default async function RestritoCriarUsuarioPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Criar conta por e-mail</h1>
      <p className="mt-1 text-sm text-muted">
        Crie a conta diretamente pelo e-mail do investidor, sem esperar ele se cadastrar sozinho.
        Uma senha temporária é gerada — repasse para a pessoa completar o cadastro.
      </p>

      <div className="mt-6 max-w-md rounded-2xl border border-border bg-surface p-6">
        <CriarUsuarioForm />
      </div>
    </div>
  );
}
