import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listarLideres } from "@/lib/incentivo-lideranca";
import { PromoverLiderButton } from "./promover-lider-form";
import { LiderancaLista } from "./lideranca-lista";
import { LiberarIncentivoTodosButton } from "./liberar-incentivo-form";

export default async function RestritoLiderancaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const lideres = await listarLideres();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Liderança</h1>
          <p className="mt-1 text-sm text-muted">
            Líderes recebem, além da rentabilidade diária normal, um incentivo de 0,10% ao dia
            sobre o próprio capital — lançado automaticamente toda vez que o PLR é liberado.
            Gerencie aqui quem é líder e o incentivo de cada um.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LiberarIncentivoTodosButton lideres={lideres} />
          <PromoverLiderButton />
        </div>
      </div>

      <div className="mt-6">
        <LiderancaLista lideres={lideres} />
      </div>
    </div>
  );
}
