/** Semeia as linhas do catálogo (ServicoPacote) — idempotente, roda de novo sem duplicar.
 *  Rodar com: npx --yes tsx src/seed-catalogo-servicos.mts */
import "dotenv/config";
import { prisma } from "./lib/prisma";
import {
  ORDEM_SERVICOS,
  NOME_SERVICO,
  DESCRICAO_SERVICO,
  TARIFA_CENTAVOS,
  CONTATO_WHATSAPP_PADRAO,
  MENSAGEM_WHATSAPP_PADRAO,
  centavosParaReais,
} from "./lib/servicos";

async function main() {
  for (const codigo of ORDEM_SERVICOS) {
    const servico = await prisma.servicoPacote.upsert({
      where: { codigo },
      update: {},
      create: {
        codigo,
        nome: NOME_SERVICO[codigo],
        descricao: DESCRICAO_SERVICO[codigo],
        tarifa: centavosParaReais(TARIFA_CENTAVOS[codigo]),
        ordem: ORDEM_SERVICOS.indexOf(codigo),
        contatoWhatsapp: CONTATO_WHATSAPP_PADRAO[codigo] ?? null,
        mensagemPadrao: CONTATO_WHATSAPP_PADRAO[codigo] ? MENSAGEM_WHATSAPP_PADRAO : null,
      },
    });
    console.log(`OK: ${servico.codigo} — ${servico.nome}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
