"use client";

import { useState, type InputHTMLAttributes } from "react";

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function maskCPF(valorBruto: string): string {
  const d = onlyDigits(valorBruto).slice(0, 11);
  let out = d.slice(0, 3);
  if (d.length > 3) out += "." + d.slice(3, 6);
  if (d.length > 6) out += "." + d.slice(6, 9);
  if (d.length > 9) out += "-" + d.slice(9, 11);
  return out;
}

export function maskCNPJ(valorBruto: string): string {
  const d = onlyDigits(valorBruto).slice(0, 14);
  let out = d.slice(0, 2);
  if (d.length > 2) out += "." + d.slice(2, 5);
  if (d.length > 5) out += "." + d.slice(5, 8);
  if (d.length > 8) out += "/" + d.slice(8, 12);
  if (d.length > 12) out += "-" + d.slice(12, 14);
  return out;
}

export function maskTelefone(valorBruto: string): string {
  const d = onlyDigits(valorBruto).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  if (resto.length <= 4) return `(${ddd}) ${resto}`;
  if (d.length <= 10) return `(${ddd}) ${resto.slice(0, 4)}-${resto.slice(4)}`;
  return `(${ddd}) ${resto.slice(0, 5)}-${resto.slice(5, 9)}`;
}

const MASCARAS = {
  cpf: { fn: maskCPF, placeholder: "000.000.000-00" },
  cnpj: { fn: maskCNPJ, placeholder: "00.000.000/0000-00" },
  telefone: { fn: maskTelefone, placeholder: "(00) 00000-0000" },
} as const;

type MaskedInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> & {
  mask: keyof typeof MASCARAS;
};

/** Input de texto com máscara aplicada enquanto digita (CPF, CNPJ ou telefone) — se comporta
 *  como um input normal em formulários com server action: só precisa de `name`, participa do
 *  FormData igual qualquer outro campo. Formata pra exibição, mas o valor real (com ou sem
 *  pontuação) é sempre limpo no servidor via onlyDigits antes de validar/gravar. */
export function MaskedInput({ mask, defaultValue, ...props }: MaskedInputProps) {
  const { fn, placeholder } = MASCARAS[mask];
  const [valor, setValor] = useState(() => fn(String(defaultValue ?? "")));

  return (
    <input
      {...props}
      type="text"
      inputMode={mask === "cpf" || mask === "cnpj" ? "numeric" : "tel"}
      placeholder={props.placeholder ?? placeholder}
      value={valor}
      onChange={(e) => setValor(fn(e.target.value))}
    />
  );
}
