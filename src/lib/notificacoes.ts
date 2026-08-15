import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { formatMoeda } from "@/lib/format";
import { enviarWhatsApp } from "@/lib/whatsapp";
import { EMAIL_CONTRATOS_REMETENTE } from "@/lib/config";

async function dadosContatoUsuario(userId: string) {
  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    include: { pessoaFisica: true, pessoaJuridica: true },
  });
  if (!usuario) return null;

  const nome =
    usuario.pessoaFisica?.nomeCompleto ??
    usuario.pessoaJuridica?.razaoSocial ??
    usuario.name ??
    "investidor(a)";
  const primeiroNome = nome.split(" ")[0];
  const telefone = usuario.pessoaFisica?.telefone ?? usuario.pessoaJuridica?.telefone ?? null;

  return { email: usuario.email, primeiroNome, telefone };
}

function emailHtml(titulo: string, mensagem: string): string {
  return `<div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
    <h2 style="color:#b8892d; margin-bottom: 16px;">${titulo}</h2>
    <p style="font-size:15px; line-height:1.6;">${mensagem}</p>
    <p style="margin-top:32px; font-size:12px; color:#888;">Foccus Invest</p>
  </div>`;
}

async function enviarEmailNotificacao(
  email: string,
  assunto: string,
  titulo: string,
  mensagem: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY não configurada — e-mail de notificação não enviado.");
    return;
  }
  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: EMAIL_CONTRATOS_REMETENTE,
      to: email,
      subject: assunto,
      html: emailHtml(titulo, mensagem),
    });
  } catch (e) {
    console.error("Falha ao enviar e-mail de notificação:", e);
  }
}

/** Dispara e-mail + WhatsApp pro investidor avisando que uma operação foi concluída. Best-effort
 *  de ponta a ponta (nunca lança erro) — a operação que motivou o aviso (aporte confirmado, saque
 *  pago) já foi persistida no banco antes de chamar isso, então uma falha aqui não deve nunca
 *  reverter nem travar a ação do admin. */
async function notificarOperacao(
  userId: string,
  assunto: string,
  titulo: string,
  mensagemPara: (primeiroNome: string) => string
): Promise<void> {
  try {
    const contato = await dadosContatoUsuario(userId);
    if (!contato) return;

    const mensagem = mensagemPara(contato.primeiroNome);

    await Promise.all([
      enviarEmailNotificacao(contato.email, assunto, titulo, mensagem),
      contato.telefone ? enviarWhatsApp(contato.telefone, mensagem) : Promise.resolve(),
    ]);
  } catch (e) {
    console.error("Falha ao notificar operação:", e);
  }
}

export async function notificarAporteConfirmado(userId: string, valor: number): Promise<void> {
  await notificarOperacao(
    userId,
    "Aporte confirmado — Foccus Invest",
    "Aporte confirmado ✅",
    (nome) =>
      `Olá, ${nome}! Seu aporte de ${formatMoeda(valor)} na Foccus Invest foi confirmado com sucesso e já está na sua carteira, com carência de 90 dias. Operação realizada com sucesso!`
  );
}

export async function notificarSaquePago(
  userId: string,
  tipo: "CAPITAL" | "RENDIMENTO" | "BONUS",
  valor: number
): Promise<void> {
  const rotulo = tipo === "CAPITAL" ? "de capital" : "de rendimentos";
  await notificarOperacao(
    userId,
    "Saque realizado com sucesso — Foccus Invest",
    "Saque realizado ✅",
    (nome) =>
      `Olá, ${nome}! Seu saque ${rotulo} de ${formatMoeda(valor)} foi realizado com sucesso via Pix. Operação realizada com sucesso!`
  );
}
