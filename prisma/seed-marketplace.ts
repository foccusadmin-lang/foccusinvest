import "dotenv/config";
import { PrismaClient, type PapelMarketplace } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { MARKETPLACE_CITY, MARKETPLACE_STATE } from "../src/lib/marketplace/config";

/**
 * Seed inicial do marketplace regional de serviços (Foccus Serviços) — categorias/profissões
 * (spec seção 10) e alguns prestadores fictícios de Jandira pra dar pra testar a busca e os
 * dashboards antes de existir um cadastro real (spec seção 48). Roda com:
 *
 *   npx tsx prisma/seed-marketplace.ts
 *
 * Idempotente: pode rodar de novo sem duplicar (usa upsert em tudo, chaveado por slug/email).
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type CategoriaSeed = {
  nome: string;
  slug: string;
  icone: string;
  servicos: { nome: string; slug: string }[];
};

const CATEGORIAS: CategoriaSeed[] = [
  {
    nome: "Casa",
    slug: "casa",
    icone: "🏠",
    servicos: [
      { nome: "Diarista", slug: "diarista" },
      { nome: "Faxineira", slug: "faxineira" },
      { nome: "Eletricista", slug: "eletricista" },
      { nome: "Encanador", slug: "encanador" },
      { nome: "Pedreiro", slug: "pedreiro" },
      { nome: "Pintor", slug: "pintor" },
      { nome: "Marceneiro", slug: "marceneiro" },
      { nome: "Montador de móveis", slug: "montador-de-moveis" },
    ],
  },
  {
    nome: "Cuidados",
    slug: "cuidados",
    icone: "👶",
    servicos: [
      { nome: "Babá", slug: "baba" },
      { nome: "Cuidador", slug: "cuidador" },
      { nome: "Acompanhante", slug: "acompanhante" },
    ],
  },
  {
    nome: "Beleza",
    slug: "beleza",
    icone: "💇",
    servicos: [
      { nome: "Manicure", slug: "manicure" },
      { nome: "Cabeleireiro", slug: "cabeleireiro" },
      { nome: "Barbeiro", slug: "barbeiro" },
      { nome: "Maquiador", slug: "maquiador" },
    ],
  },
  {
    nome: "Tecnologia",
    slug: "tecnologia",
    icone: "💻",
    servicos: [
      { nome: "Técnico de informática", slug: "tecnico-de-informatica" },
      { nome: "Desenvolvedor", slug: "desenvolvedor" },
      { nome: "Designer", slug: "designer" },
      { nome: "Social media", slug: "social-media" },
    ],
  },
  {
    nome: "Eventos",
    slug: "eventos",
    icone: "📸",
    servicos: [
      { nome: "Fotógrafo", slug: "fotografo" },
      { nome: "Videomaker", slug: "videomaker" },
      { nome: "DJ", slug: "dj" },
      { nome: "Garçom", slug: "garcom" },
      { nome: "Decorador", slug: "decorador" },
    ],
  },
  {
    nome: "Educação",
    slug: "educacao",
    icone: "📚",
    servicos: [
      { nome: "Professor particular", slug: "professor-particular" },
      { nome: "Professor de idiomas", slug: "professor-de-idiomas" },
      { nome: "Reforço escolar", slug: "reforco-escolar" },
    ],
  },
];

type PrestadorSeed = {
  nome: string;
  email: string;
  servicoSlug: string;
  bairro: string;
  descricao: string;
  raioAtendimentoKm: number;
  precoDe: number;
  verificado: boolean;
};

// Dados DEMO — claramente identificados pelo prefixo "[DEMO]" no nome e pelo domínio de e-mail
// @foccusservicos.demo, pra nunca serem confundidos com prestadores reais (spec seção 48).
const PRESTADORES_DEMO: PrestadorSeed[] = [
  {
    nome: "[DEMO] Ana Souza",
    email: "demo-ana-souza@foccusservicos.demo",
    servicoSlug: "baba",
    bairro: "Novo Horizonte",
    descricao: "Babá experiente, referências de famílias da região.",
    raioAtendimentoKm: 5,
    precoDe: 80,
    verificado: true,
  },
  {
    nome: "[DEMO] Carlos Oliveira",
    email: "demo-carlos-oliveira@foccusservicos.demo",
    servicoSlug: "eletricista",
    bairro: "Centro",
    descricao: "Eletricista, instalações e manutenção residencial.",
    raioAtendimentoKm: 8,
    precoDe: 100,
    verificado: true,
  },
  {
    nome: "[DEMO] Maria Santos",
    email: "demo-maria-santos@foccusservicos.demo",
    servicoSlug: "diarista",
    bairro: "Jardim Silveira",
    descricao: "Diarista, limpeza residencial completa.",
    raioAtendimentoKm: 5,
    precoDe: 120,
    verificado: false,
  },
  {
    nome: "[DEMO] João Pereira",
    email: "demo-joao-pereira@foccusservicos.demo",
    servicoSlug: "encanador",
    bairro: "Jardim Alvorada",
    descricao: "Encanador, reparos e instalações hidráulicas.",
    raioAtendimentoKm: 10,
    precoDe: 90,
    verificado: false,
  },
];

async function seedCategorias() {
  const servicoIdPorSlug = new Map<string, string>();

  for (const categoria of CATEGORIAS) {
    const categoriaSalva = await prisma.categoriaServico.upsert({
      where: { slug: categoria.slug },
      update: { nome: categoria.nome, icone: categoria.icone },
      create: {
        nome: categoria.nome,
        slug: categoria.slug,
        icone: categoria.icone,
      },
    });

    for (const servico of categoria.servicos) {
      const servicoSalvo = await prisma.servico.upsert({
        where: { slug: servico.slug },
        update: { nome: servico.nome, categoriaId: categoriaSalva.id },
        create: {
          nome: servico.nome,
          slug: servico.slug,
          categoriaId: categoriaSalva.id,
        },
      });
      servicoIdPorSlug.set(servico.slug, servicoSalvo.id);
    }
  }

  console.log(`✓ ${CATEGORIAS.length} categorias e ${servicoIdPorSlug.size} serviços.`);
  return servicoIdPorSlug;
}

async function seedPrestadoresDemo(servicoIdPorSlug: Map<string, string>) {
  const papelPrestador: PapelMarketplace = "PRESTADOR";

  for (const dados of PRESTADORES_DEMO) {
    const servicoId = servicoIdPorSlug.get(dados.servicoSlug);
    if (!servicoId) {
      console.warn(`⚠ Serviço "${dados.servicoSlug}" não encontrado — pulando ${dados.nome}.`);
      continue;
    }

    const user = await prisma.user.upsert({
      where: { email: dados.email },
      update: { papelMarketplace: papelPrestador },
      create: {
        email: dados.email,
        name: dados.nome,
        papelMarketplace: papelPrestador,
      },
    });

    const perfil = await prisma.perfilPrestador.upsert({
      where: { userId: user.id },
      update: {
        nomeProfissional: dados.nome,
        descricao: dados.descricao,
        bairro: dados.bairro,
        cidade: MARKETPLACE_CITY,
        estado: MARKETPLACE_STATE,
        raioAtendimentoKm: dados.raioAtendimentoKm,
        precoDe: dados.precoDe,
        verificado: dados.verificado,
        ativo: true,
      },
      create: {
        userId: user.id,
        nomeProfissional: dados.nome,
        descricao: dados.descricao,
        bairro: dados.bairro,
        cidade: MARKETPLACE_CITY,
        estado: MARKETPLACE_STATE,
        raioAtendimentoKm: dados.raioAtendimentoKm,
        precoDe: dados.precoDe,
        verificado: dados.verificado,
        ativo: true,
      },
    });

    await prisma.prestadorServico.upsert({
      where: { prestadorId_servicoId: { prestadorId: perfil.id, servicoId } },
      update: {},
      create: { prestadorId: perfil.id, servicoId },
    });
  }

  console.log(`✓ ${PRESTADORES_DEMO.length} prestadores demo em ${MARKETPLACE_CITY}-${MARKETPLACE_STATE}.`);
}

async function main() {
  const servicoIdPorSlug = await seedCategorias();
  await seedPrestadoresDemo(servicoIdPorSlug);
}

main()
  .catch((erro) => {
    console.error("Falha ao rodar o seed do marketplace:", erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
