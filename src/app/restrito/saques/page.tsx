import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SaquesTable } from "./saques-table";

export default async function RestritoSaquesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const saques = await prisma.solicitacaoSaque.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { criadoEm: "desc" },
    take: 100,
  });

  const pendentes = saques.filter((s) => s.status === "SOLICITADO" || s.status === "APROVADO");
  const historico = saques.filter((s) => s.status === "PAGO" || s.status === "RECUSADO" || s.status === "CANCELADO");

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Saques</h1>
      <p className="mt-1 text-sm text-muted">
        {pendentes.length} solicitação(ões) aguardando ação.
      </p>

      <SaquesTable pendentes={pendentes} historico={historico} />
    </div>
  );
}
