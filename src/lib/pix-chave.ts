import { onlyDigits, isValidCPF, isValidCNPJ } from "@/lib/cpf-cnpj";

/**
 * Validação e normalização de chave Pix, por tipo. O investidor escolhe o tipo explicitamente
 * no formulário (em vez de tentar adivinhar a partir do valor digitado) — isso elimina de
 * propósito a ambiguidade que uma chave só numérica teria (poderia ser CPF ou telefone, por
 * exemplo): a validação sempre confere o valor contra o tipo escolhido, e só ele.
 */
export type TipoChavePixForm = "TELEFONE" | "CPF" | "CNPJ" | "EMAIL" | "ALEATORIA";

export const LABEL_TIPO_CHAVE_PIX: Record<TipoChavePixForm, string> = {
  TELEFONE: "Telefone",
  CPF: "CPF",
  CNPJ: "CNPJ",
  EMAIL: "E-mail",
  ALEATORIA: "Chave aleatória",
};

export type ResultadoChavePix =
  | { ok: false; error: string }
  | { ok: true; chaveNormalizada: string; tipo: TipoChavePixForm };

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Chave aleatória do Pix é sempre um UUID v4 (formato fixo definido pelo Bacen).
const REGEX_CHAVE_ALEATORIA = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** Valida o valor contra o tipo de chave escolhido e devolve a versão normalizada (padrão que o
 *  Bacen exige dentro do payload Pix). Nunca tenta adivinhar o tipo — se o valor não bater com o
 *  tipo escolhido, retorna erro claro em vez de gerar QR Code com dado errado ou ambíguo. */
export function normalizarChavePix(valorOriginal: string, tipo: TipoChavePixForm): ResultadoChavePix {
  const valor = (valorOriginal ?? "").trim();
  if (!valor) return { ok: false, error: "Informe a chave Pix." };

  switch (tipo) {
    case "TELEFONE": {
      let digitos = onlyDigits(valor);
      // Aceita tanto com quanto sem o DDI 55 já incluído.
      if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
      if (digitos.length !== 12 && digitos.length !== 13) {
        return { ok: false, error: "Telefone inválido. Use o formato (DDD) 9XXXX-XXXX, com DDD." };
      }
      return { ok: true, chaveNormalizada: `+${digitos}`, tipo };
    }

    case "CPF": {
      if (!isValidCPF(valor)) {
        return {
          ok: false,
          error: "CPF inválido — confira os números digitados (dígito verificador não bate).",
        };
      }
      return { ok: true, chaveNormalizada: onlyDigits(valor), tipo };
    }

    case "CNPJ": {
      if (!isValidCNPJ(valor)) {
        return {
          ok: false,
          error: "CNPJ inválido — confira os números digitados (dígito verificador não bate).",
        };
      }
      return { ok: true, chaveNormalizada: onlyDigits(valor), tipo };
    }

    case "EMAIL": {
      const email = valor.toLowerCase();
      if (email.length > 77 || !REGEX_EMAIL.test(email)) {
        return { ok: false, error: "E-mail inválido — confira o endereço digitado." };
      }
      return { ok: true, chaveNormalizada: email, tipo };
    }

    case "ALEATORIA": {
      if (!REGEX_CHAVE_ALEATORIA.test(valor)) {
        return {
          ok: false,
          error:
            "Chave aleatória inválida — precisa estar no formato UUID (ex: 123e4567-e89b-12d3-a456-426614174000), igual aparece no app do seu banco.",
        };
      }
      return { ok: true, chaveNormalizada: valor.toLowerCase(), tipo };
    }

    default:
      return { ok: false, error: "Tipo de chave Pix inválido." };
  }
}
