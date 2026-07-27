import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") {
    return new NextResponse("Acesso negado.", { status: 403 });
  }

  const { id } = await params;
  const aplicacao = await prisma.aplicacao.findUnique({
    where: { id },
    select: { comprovante: true, comprovanteNome: true, comprovanteTipo: true },
  });

  if (!aplicacao?.comprovante) {
    return new NextResponse("Comprovante não encontrado.", { status: 404 });
  }

  return new NextResponse(new Uint8Array(aplicacao.comprovante), {
    headers: {
      "Content-Type": aplicacao.comprovanteTipo ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${aplicacao.comprovanteNome ?? "comprovante"}"`,
    },
  });
}
