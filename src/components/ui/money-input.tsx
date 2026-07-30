"use client";

import type { InputHTMLAttributes } from "react";

/** Máscara de moeda pt-BR: sempre trata os dois últimos dígitos digitados como centavos.
 *  Ex: "1" -> "0,01", "100000" -> "1.000,00". Só dígitos são considerados — apagar
 *  qualquer caractere (número ou separador) reformata a partir do que sobrou. */
export function maskMoeda(valorBruto: string): string {
  const digitos = valorBruto.replace(/\D/g, "");
  if (!digitos) return "";
  const reais = parseInt(digitos, 10) / 100;
  return reais.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: string;
  onValueChange: (valorFormatado: string) => void;
};

export function MoneyInput({ value, onValueChange, ...props }: MoneyInputProps) {
  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => onValueChange(maskMoeda(e.target.value))}
    />
  );
}
