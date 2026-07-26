import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { buildCodigoIndicacao } from "@/lib/codigo-indicacao";
import { verifyPassword } from "@/lib/password";
import { ADMIN_EMAIL } from "@/lib/config";

export const googleConfigurado = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    ...(googleConfigurado ? [Google] : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.senha) return null;

        const valido = await verifyPassword(password, user.senha);
        if (!valido) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  events: {
    async createUser({ user }) {
      if (!user.id || !user.name) return;
      await prisma.user.update({
        where: { id: user.id },
        data: { codigoIndicacao: buildCodigoIndicacao(user.name) },
      });
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      if (token.id) {
        let dbUser = await prisma.user.findUnique({ where: { id: token.id as string } });

        if (
          dbUser &&
          dbUser.email.toLowerCase() === ADMIN_EMAIL &&
          (dbUser.perfil !== "ADMIN" || dbUser.statusCadastro !== "APROVADO")
        ) {
          dbUser = await prisma.user.update({
            where: { id: dbUser.id },
            data: { perfil: "ADMIN", statusCadastro: "APROVADO" },
          });
        }

        if (dbUser) {
          token.perfil = dbUser.perfil;
          token.statusCadastro = dbUser.statusCadastro;
          token.codigoIndicacao = dbUser.codigoIndicacao;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.perfil = token.perfil as typeof session.user.perfil;
        session.user.statusCadastro = token.statusCadastro as typeof session.user.statusCadastro;
        session.user.codigoIndicacao = token.codigoIndicacao as string | null;
      }
      return session;
    },
  },
});
