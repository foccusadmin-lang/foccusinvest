"use server";

import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export type RecuperarState =
  | { status: "idle" }
  | { status: "enviado"; devLink?: string }
  | { status: "erro"; error: string };

const UMA_HORA_MS = 60 * 60 * 1000;

export async function solicitarRecuperacao(
  _prevState: RecuperarState,
  formData: FormData
): Promise<RecuperarState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { status: "erro", error: "Informe seu e-mail." };

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const token = randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expires: new Date(Date.now() + UMA_HORA_MS),
      },
    });

    const link = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/redefinir-senha?token=${token}`;

    if (process.env.NODE_ENV !== "production") {
      console.log(`[recuperação de senha] link para ${email}: ${link}`);
      return { status: "enviado", devLink: link };
    }

    // TODO: enviar `link` por e-mail via provedor (Resend, SES, etc.) quando configurado.
  }

  // Resposta idêntica mesmo se o e-mail não existir, para não revelar cadastros.
  return { status: "enviado" };
}
