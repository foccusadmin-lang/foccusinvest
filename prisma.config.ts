import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrações usam a conexão direta (sem pgbouncer) — o app em runtime usa DATABASE_URL.
    url: process.env["DIRECT_URL"],
  },
});
