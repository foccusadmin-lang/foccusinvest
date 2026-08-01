import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  // O padrão do Next.js é 1MB por Server Action — abaixo do limite de 5MB que o app já
  // permite pro comprovante de pagamento, causando erro só em envios com arquivo maior
  // (mais comum em aportes de valor alto, com comprovante de melhor qualidade).
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
