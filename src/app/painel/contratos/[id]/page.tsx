import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ContratoDocumento } from "@/components/contrato/contrato-documento";
import { PrintButton } from "../print-button";

export default async function ContratoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;

  const contrato = await prisma.contrato.findUnique({ where: { id } });
  if (!contrato) notFound();
  if (contrato.userId !== session.user.id && session.user.perfil !== "ADMIN") {
    redirect("/painel/contratos");
  }

  return (
    <div className="min-h-screen bg-background py-6">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Link href="/painel/contratos" className="text-sm text-gold-light hover:underline">
            ← Voltar
          </Link>
          <PrintButton />
        </div>
        <div className="overflow-hidden rounded-2xl">
          <ContratoDocumento
            nome={contrato.nome}
            email={contrato.email}
            cpf={contrato.cpf}
            rg={contrato.rg}
            nacionalidade={contrato.nacionalidade}
            estadoCivil={contrato.estadoCivil}
            profissao={contrato.profissao}
            telefone={contrato.telefone}
            endereco={contrato.endereco}
            valor={contrato.valor}
            valorExtenso={contrato.valorExtenso}
            data={contrato.criadoEm}
          />
        </div>
      </div>
    </div>
  );
}
