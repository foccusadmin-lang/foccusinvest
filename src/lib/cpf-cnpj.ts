export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map(Number);
  const calcCheckDigit = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += digits[i] * (length + 1 - i);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return (
    calcCheckDigit(9) === digits[9] && calcCheckDigit(10) === digits[10]
  );
}

export function isValidCNPJ(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const digits = cnpj.split("").map(Number);
  const calcCheckDigit = (length: number) => {
    const weights =
      length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < length; i++) sum += digits[i] * weights[i];
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return (
    calcCheckDigit(12) === digits[12] && calcCheckDigit(13) === digits[13]
  );
}

export function formatCPF(value: string): string {
  const cpf = onlyDigits(value).padEnd(11, "_");
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`;
}

export function formatCNPJ(value: string): string {
  const cnpj = onlyDigits(value).padEnd(14, "_");
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12, 14)}`;
}

export function maskCPF(value: string): string {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return value;
  return `***.${cpf.slice(3, 6)}.***-${cpf.slice(9, 11)}`;
}

export function maskCNPJ(value: string): string {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return value;
  return `**.${cnpj.slice(2, 5)}.***/****-${cnpj.slice(12, 14)}`;
}
