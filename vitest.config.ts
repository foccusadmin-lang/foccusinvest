import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Os testes de integração rodam contra o banco real (dev/prod compartilhado), e mais de um
    // arquivo cria/mexe na mesma EstrategiaOperacao "ativa" (singleton lógico) via
    // criarDistribuicao — com arquivos em paralelo (padrão do Vitest), dois testes de arquivos
    // diferentes podem colidir no mesmo dia/estratégia e um sobrescrever o ponto do outro.
    // Roda os arquivos em sequência pra eliminar essa classe de flakiness — mais lento, mas o
    // suite inteiro já é pequeno o bastante pra não doer.
    fileParallelism: false,
  },
});
