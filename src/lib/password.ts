import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  const hashBuffer = Buffer.from(hash, "hex");
  if (derived.length !== hashBuffer.length) return false;
  return timingSafeEqual(derived, hashBuffer);
}

export function validarForcaSenha(senha: string): string | null {
  if (senha.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
  if (!/[a-zA-Z]/.test(senha)) return "A senha deve conter pelo menos uma letra.";
  if (!/[0-9]/.test(senha)) return "A senha deve conter pelo menos um número.";
  return null;
}
