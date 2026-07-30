import { Resend } from "resend";
import { ContratoDocumento, type ContratoDocumentoProps } from "@/components/contrato/contrato-documento";
import { formatMoeda } from "@/lib/format";
import { EMAIL_CONTRATOS_REMETENTE } from "@/lib/config";

/** Envio de e-mail é best-effort: se a chave não estiver configurada ou o envio falhar,
 *  registra no log mas não interrompe o fluxo de aplicação (o dinheiro/contrato já foi
 *  registrado no banco de qualquer forma). */
export async function enviarEmailContrato(dados: ContratoDocumentoProps): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY não configurada — e-mail de contrato não enviado.");
    return;
  }

  const { renderToStaticMarkup } = await import("react-dom/server");
  const html = renderToStaticMarkup(<ContratoDocumento {...dados} />);

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: EMAIL_CONTRATOS_REMETENTE,
      to: dados.email,
      subject: `Seu contrato Foccus Invest — aplicação de ${formatMoeda(dados.valor)}`,
      html,
    });
  } catch (e) {
    console.error("Falha ao enviar e-mail de contrato:", e);
  }
}
