import type { PerfilPrestador } from "@prisma/client";

/**
 * % de conclusão do perfil do prestador (seção 40 do spec) — usado pra mostrar "Perfil X%
 * completo" e incentivar a pessoa a preencher os dados antes de publicar. Cada campo abaixo
 * pesa igual; `nomeProfissional`/cidade/estado já vêm preenchidos na criação do perfil, então
 * nunca começa do zero.
 */
const CAMPOS_PERFIL_PRESTADOR = [
  "nomeProfissional",
  "descricao",
  "telefone",
  "fotoUrl",
  "regiaoPrincipalId",
  "endereco",
  "precoDe",
] as const;

export function calcularCompletudePerfilPrestador(perfil: PerfilPrestador): number {
  const preenchidos = CAMPOS_PERFIL_PRESTADOR.filter((campo) => {
    const valor = perfil[campo];
    return valor !== null && valor !== undefined && valor !== "";
  }).length;
  return Math.round((preenchidos / CAMPOS_PERFIL_PRESTADOR.length) * 100);
}
