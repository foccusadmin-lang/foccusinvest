import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EstrategiaForm } from "./estrategia-form";
import { PontosLista } from "./pontos-lista";

export default async function RestritoEstrategiaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const estrategia = await prisma.estrategiaOperacao.findFirst({
    orderBy: { criadoEm: "desc" },
    include: { pontos: { orderBy: { data: "desc" } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Vitrine de Operação</h1>
      <p className="mt-1 text-sm text-muted">
        Configure a estratégia exibida no painel dos investidores (moedas trabalhadas, faixa
        esperada de resultado) e lance a variação percentual de cada dia — o acumulado e o
        gráfico Comparativo são calculados automaticamente a partir desses lançamentos.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
            {estrategia ? "Editar estratégia" : "Criar estratégia"}
          </p>
          <EstrategiaForm estrategia={estrategia} />
        </div>

        {estrategia && (
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Lançar variação diária
            </p>
            <PontosLista estrategiaId={estrategia.id} pontos={estrategia.pontos} />
          </div>
        )}
      </div>
    </div>
  );
}
