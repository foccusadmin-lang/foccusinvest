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
    // Os testes de integração fazem dezenas de idas e voltas a um banco remoto — o padrão de 5s
    // estoura por latência de rede (não por lógica errada) em testes de vários passos.
    testTimeout: 30_000,
    hookTimeout: 30_000,
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
