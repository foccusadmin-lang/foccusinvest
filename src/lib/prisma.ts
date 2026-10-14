import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function criarPrisma(): PrismaClient {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Cada função serverless da Vercel roda um pool próprio — sem um teto baixo aqui, muitas
    // invocações concorrentes (ex: logo após um deploy, com várias instâncias frias ao mesmo
    // tempo) podem somar mais conexões reais do que o Postgres do Supabase aceita (o pooler já
    // multiplexa isso, não precisa de um pool grande de cada lado). Um erro de "too many clients"
    // nessa hora derruba a requisição inteira com a tela genérica de erro do servidor.
    max: 3,
    // Conexão ociosa fecha em 5s (padrão do pg: 10s) e pedir conexão não espera pra sempre.
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
  });

  // Instância serverless "congelada" entre requisições não roda timers, então o idle timeout acima
  // nunca disparava e as conexões ficavam penduradas no pooler do Supabase até estourar o limite de
  // 200 clientes ("EMAXCONN max client connections reached") — que aparecia pro usuário como a tela
  // "Algo deu errado". Isso fecha as conexões ociosas antes da instância ser suspensa (no-op fora
  // da Vercel).
  attachDatabasePool(pool);

  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma = globalForPrisma.prisma ?? criarPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
