import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SaquesTable } from "./saques-table";

export default async function RestritoSaquesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const saques = await prisma.solicitacaoSaque.findMany({
    include: {
      user: { select: { name: true, email: true } },
      processadoPor: { select: { name: true, email: true } },
    },
    omit: { pixQrCodePng: true },
    orderBy: { criadoEm: "desc" },
    take: 500,
  });

  const pendentes = saques.filter((s) => s.status === "SOLICITADO" || s.status === "AGUARDANDO_PAGAMENTO");
  const historico = saques.filter(
    (s) => s.status === "PAGO" || s.status === "RECUSADO" || s.status === "CANCELADO"
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Solicitações de Saque</h1>
      <p className="mt-1 text-sm text-muted">
        {pendentes.length} solicitação(ões) aguardando ação.
      </p>

      <SaquesTable pendentes={pendentes} historico={historico} />
    </div>
  );
}
