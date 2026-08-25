import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  // Cada função serverless da Vercel roda um pool próprio — sem um teto baixo aqui, muitas
  // invocações concorrentes (ex: logo após um deploy, com várias instâncias frias ao mesmo
  // tempo) podem somar mais conexões reais do que o Postgres do Supabase aceita (o pooler já
  // multiplexa isso, não precisa de um pool grande de cada lado). Um erro de "too many clients"
  // nessa hora derruba a requisição inteira com a tela genérica de erro do servidor.
  max: 3,
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
