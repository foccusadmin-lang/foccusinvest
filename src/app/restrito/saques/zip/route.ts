import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** ZIP com o QR Code PNG individual de cada solicitacao programada pra uma sexta-feira - nunca
 *  mistura pago com pendente no mesmo arquivo (?incluirPagos=1 separa em pastas diferentes
 *  dentro do mesmo ZIP em vez de misturar soltos). */
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
    include: { user: { select: { name: true } } },
    orderBy: { criadoEm: "asc" },
  });

  if (saques.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma solicitacao com QR Code programada pra essa sexta-feira." },
      { status: 404 }
    );
  }

  const zip = new JSZip();
  for (const saque of saques) {
    if (!saque.pixQrCodePng) continue;
    const pasta = saque.status === "PAGO" ? "pagos" : "aguardando-pagamento";
    const nomeArquivo = sanitizarNomeArquivo(
      `${saque.investidorNome ?? saque.user.name ?? saque.id}-${saque.pixTxid ?? saque.id}.png`
    );
    zip.file(`${pasta}/${nomeArquivo}`, new Uint8Array(saque.pixQrCodePng));
  }

  const bytes = await zip.generateAsync({ type: "uint8array" });
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="qrcodes-pix-${sextaStr}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}

// Remove acentos (via NFD + faixa Unicode de marcas diacriticas combinantes, U+0300-U+036F) e
// qualquer caractere fora de letras/numeros/ponto/traco/underscore, pra virar um nome de arquivo
// seguro em qualquer sistema operacional.
const REGEX_MARCAS_DIACRITICAS = /[̀-ͯ]/g;

function sanitizarNomeArquivo(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(REGEX_MARCAS_DIACRITICAS, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(0, 100);
}
