import "dotenv/config";
import { PrismaClient, type PapelMarketplace } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { MARKETPLACE_CITY, MARKETPLACE_STATE } from "../src/lib/marketplace/config";
import { slugificarRegiao } from "../src/lib/marketplace/regioes";

/**
 * Seed inicial do marketplace regional de serviços (Foccus Serviços) — categorias/profissões
 * (spec seção 10), bairros iniciais de Jandira (spec "Parte 2", seção 4) e alguns prestadores
 * fictícios pra dar pra testar a busca por região e os dashboards antes de existir cadastro
 * real (spec seção 48). Roda com:
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

// Lista inicial de bairros de Jandira-SP — NÃO é definitiva (spec "Parte 2", seção 4). Serve só
// pra sair do zero; o admin adiciona, corrige e desativa bairros pelo painel
// (/marketplace/admin/regioes) sem precisar tocar em código.
const BAIRROS_INICIAIS_JANDIRA = [
  "Centro",
  "Novo Horizonte",
  "Jardim Silveira",
  "Vila Eunice",
  "Jardim Brotinho",
  "Jardim Alvorada",
  "Jardim Bandeirantes",
  "Represa",
  "Cidade Nova",
  "Vila São Luiz",
];

type PrestadorSeed = {
  nome: string;
  email: string;
  servicoSlug: string;
  // Onde mora (spec seção 26) — pode ser diferente de onde atende.
  regiaoPrincipal: string;
  // Onde atende — pode incluir bairros além de onde mora.
  atende: string[];
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
    regiaoPrincipal: "Novo Horizonte",
    atende: ["Novo Horizonte", "Centro", "Jardim Silveira"],
    descricao: "Babá experiente, referências de famílias da região.",
    raioAtendimentoKm: 5,
    precoDe: 80,
    verificado: true,
  },
  {
    nome: "[DEMO] Carlos Oliveira",
    email: "demo-carlos-oliveira@foccusservicos.demo",
    servicoSlug: "eletricista",
    regiaoPrincipal: "Centro",
    atende: ["Centro", "Novo Horizonte", "Jardim Silveira", "Vila Eunice"],
    descricao: "Eletricista, instalações e manutenção residencial.",
    raioAtendimentoKm: 8,
    precoDe: 100,
    verificado: true,
  },
  {
    // Mora em Jardim Silveira mas também atende Novo Horizonte — cobre de propósito o caso da
    // spec (seção 9): o cliente que procura em Novo Horizonte precisa achar esse prestador
    // mesmo ele não morando lá.
    nome: "[DEMO] Maria Santos",
    email: "demo-maria-santos@foccusservicos.demo",
    servicoSlug: "diarista",
    regiaoPrincipal: "Jardim Silveira",
    atende: ["Jardim Silveira", "Vila Eunice", "Novo Horizonte", "Centro"],
    descricao: "Diarista, limpeza residencial completa.",
    raioAtendimentoKm: 5,
    precoDe: 120,
    verificado: false,
  },
  {
    nome: "[DEMO] João Pereira",
    email: "demo-joao-pereira@foccusservicos.demo",
    servicoSlug: "encanador",
    regiaoPrincipal: "Jardim Alvorada",
    atende: ["Jardim Alvorada", "Centro", "Vila Eunice", "Jardim Brotinho"],
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

async function seedRegioes() {
  const regiaoIdPorNome = new Map<string, string>();

  for (const nome of BAIRROS_INICIAIS_JANDIRA) {
    const slug = slugificarRegiao(nome);
    const regiao = await prisma.regiao.upsert({
      where: { cidade_slug: { cidade: MARKETPLACE_CITY, slug } },
      update: { nome },
      create: {
        nome,
        slug,
        cidade: MARKETPLACE_CITY,
        estado: MARKETPLACE_STATE,
      },
    });
    regiaoIdPorNome.set(nome, regiao.id);
  }

  console.log(`✓ ${regiaoIdPorNome.size} bairros em ${MARKETPLACE_CITY}-${MARKETPLACE_STATE}.`);
  return regiaoIdPorNome;
}

async function seedPrestadoresDemo(
  servicoIdPorSlug: Map<string, string>,
  regiaoIdPorNome: Map<string, string>
) {
  const papelPrestador: PapelMarketplace = "PRESTADOR";

  for (const dados of PRESTADORES_DEMO) {
    const servicoId = servicoIdPorSlug.get(dados.servicoSlug);
    if (!servicoId) {
      console.warn(`⚠ Serviço "${dados.servicoSlug}" não encontrado — pulando ${dados.nome}.`);
      continue;
    }
    const regiaoPrincipalId = regiaoIdPorNome.get(dados.regiaoPrincipal);
    if (!regiaoPrincipalId) {
      console.warn(`⚠ Bairro "${dados.regiaoPrincipal}" não encontrado — pulando ${dados.nome}.`);
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

    const dadosPerfil = {
      nomeProfissional: dados.nome,
      descricao: dados.descricao,
      regiaoPrincipalId,
      cidade: MARKETPLACE_CITY,
      estado: MARKETPLACE_STATE,
      raioAtendimentoKm: dados.raioAtendimentoKm,
      precoDe: dados.precoDe,
      verificado: dados.verificado,
      ativo: true,
    };

    const perfil = await prisma.perfilPrestador.upsert({
      where: { userId: user.id },
      update: dadosPerfil,
      create: { userId: user.id, ...dadosPerfil },
    });

    await prisma.prestadorServico.upsert({
      where: { prestadorId_servicoId: { prestadorId: perfil.id, servicoId } },
      update: {},
      create: { prestadorId: perfil.id, servicoId },
    });

    for (const nomeBairro of dados.atende) {
      const regiaoId = regiaoIdPorNome.get(nomeBairro);
      if (!regiaoId) {
        console.warn(`⚠ Bairro "${nomeBairro}" não encontrado — pulando pra ${dados.nome}.`);
        continue;
      }
      await prisma.prestadorRegiao.upsert({
        where: { prestadorId_regiaoId: { prestadorId: perfil.id, regiaoId } },
        update: {},
        create: { prestadorId: perfil.id, regiaoId },
      });
    }
  }

  console.log(`✓ ${PRESTADORES_DEMO.length} prestadores demo em ${MARKETPLACE_CITY}-${MARKETPLACE_STATE}.`);
}

async function main() {
  const servicoIdPorSlug = await seedCategorias();
  const regiaoIdPorNome = await seedRegioes();
  await seedPrestadoresDemo(servicoIdPorSlug, regiaoIdPorNome);
}

main()
  .catch((erro) => {
    console.error("Falha ao rodar o seed do marketplace:", erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
