import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatData } from "@/lib/format";
import { gerarPdfSaques } from "@/lib/saques-pdf";

/** PDF com os saques programados pra uma sexta-feira, 4 QR Codes por página, pra imprimir e
 *  levar pro caixa/app do banco. Só pendentes por padrão (?incluirPagos=1 pra incluir também os
 *  já pagos, mas nunca misturados na mesma folha — cada status vira sua própria seção/página). */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const sextaStr = request.nextUrl.searchParams.get("sexta");
  if (!sextaStr || !/^\d{4}-\d{2}-\d{2}$/.test(sextaStr)) {
    return NextResponse.json({ error: "Informe ?sexta=YYYY-MM-DD." }, { status: 400 });
  }
  const incluirPagos = request.nextUrl.searchParams.get("incluirPagos") === "1";

  const inicioDoDia = new Date(`${sextaStr}T00:00:00-03:00`);
  const fimDoDia = new Date(`${sextaStr}T23:59:59-03:00`);

  const saques = await prisma.solicitacaoSaque.findMany({
    where: {
      dataProgramadaPagamento: { gte: inicioDoDia, lte: fimDoDia },
      status: incluirPagos ? { in: ["AGUARDANDO_PAGAMENTO", "PAGO"] } : "AGUARDANDO_PAGAMENTO",
      pixQrCodePng: { not: null },
    },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { criadoEm: "asc" },
  });

  if (saques.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma solicitação com QR Code programada pra essa sexta-feira." },
      { status: 404 }
    );
  }

  // Nunca mistura pago com pendente na mesma folha — agrupa e cada bloco vira suas próprias
  // páginas, pendentes primeiro.
  const grupos = [
    { titulo: "Aguardando pagamento", itens: saques.filter((s) => s.status === "AGUARDANDO_PAGAMENTO") },
    { titulo: "Já pagos", itens: saques.filter((s) => s.status === "PAGO") },
  ]
    .filter((g) => g.itens.length > 0)
    .map((g) => ({
      titulo: g.titulo,
      itens: g.itens.map((s) => ({
        nome: s.investidorNome ?? s.user.name ?? s.user.email,
        valor: s.valor,
        moeda: s.moeda,
        tipo: s.tipo,
        status: s.status,
        chavePixNormalizada: s.chavePixNormalizada,
        chavePixTipo: s.chavePixTipo,
        criadoEm: s.criadoEm,
        pixTxid: s.pixTxid,
        pixQrCodePng: s.pixQrCodePng ? new Uint8Array(s.pixQrCodePng) : null,
      })),
    }));

  const bytes = await gerarPdfSaques(`sexta-feira ${formatData(inicioDoDia)}`, grupos);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="saques-pix-${sextaStr}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
