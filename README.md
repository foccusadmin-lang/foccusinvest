This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Marketplace regional de serviços (Foccus Serviços)

Módulo à parte, em `/marketplace`, reaproveitando o mesmo login (Google/NextAuth) e banco
Postgres/Prisma do app principal — não usa Supabase Auth/Storage.

- **Fase 1**: escolha de papel (cliente/prestador), banco/roles, dashboards básicos e dados demo.
- **Sistema de regiões e bairros**: bairros vêm do banco (`Regiao`), nunca fixos no código —
  admin cadastra/edita/desativa em `/marketplace/admin/regioes`; prestador escolhe onde mora e
  onde atende (pode ser mais de um bairro) em `/marketplace/prestador/regiao`; cliente busca por
  serviço + bairro em `/marketplace/cliente/buscar`, com "não encontrei meu bairro" enviando uma
  sugestão pra aprovação do admin. Não depende de Google Maps — é 100% seleção manual por bairro.
- **Busca ao vivo**: em `/marketplace/cliente/buscar`, digitar o serviço (ex.: "mecânico") e o
  bairro (ex.: "Jardim Silveira") e escolher nas sugestões já mostra os prestadores na sequência,
  sem botão "Pesquisar" — a busca roda direto no Postgres via Server Action, sem nenhuma API
  externa (sem custo de Google Maps/Places).

Mapa, geolocalização automática, categorias administráveis pelo painel e o fluxo completo de
solicitação/avaliação pela UI chegam nas próximas fases.

Variáveis de ambiente (todas opcionais — usam Jandira/SP/BR como padrão se não definidas):

```
NEXT_PUBLIC_APP_CITY=Jandira
NEXT_PUBLIC_APP_STATE=SP
NEXT_PUBLIC_APP_COUNTRY=BR
```

Para popular categorias/profissões e alguns prestadores fictícios de Jandira (dados claramente
marcados com `[DEMO]`):

```bash
npm run db:seed:marketplace
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
