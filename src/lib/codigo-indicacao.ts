const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomChars(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return result;
}

function normalizeName(name: string): string {
  const firstName = name.trim().split(/\s+/)[0] ?? "USUARIO";
  return firstName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .slice(0, 12) || "USUARIO";
}

export function buildCodigoIndicacao(name: string): string {
  return `${randomChars(5)}-${normalizeName(name)}`;
}
