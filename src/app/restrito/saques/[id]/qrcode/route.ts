import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Serve o PNG do QR Code Pix de uma solicitação de saque — só pra admin (o QR Code carrega a
 *  chave Pix do investidor, então nunca deve ficar acessível a mais ninguém). Com
 *  `?download=1`, força o download em vez de exibir inline (usado pelo botão "Baixar QR Code
 *  individual em PNG"). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await params;
  const saque = await prisma.solicitacaoSaque.findUnique({
    where: { id },
    select: { pixQrCodePng: true, pixTxid: true },
  });
  if (!saque?.pixQrCodePng) {
    return NextResponse.json({ error: "QR Code não encontrado." }, { status: 404 });
  }

  const download = request.nextUrl.searchParams.get("download") === "1";

  return new NextResponse(new Uint8Array(saque.pixQrCodePng), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, no-store",
      ...(download
        ? { "Content-Disposition": `attachment; filename="pix-${saque.pixTxid ?? id}.png"` }
        : {}),
    },
  });
}
