import { cookies } from "next/headers";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { buildCodigoIndicacao } from "@/lib/codigo-indicacao";
import { vincularMigracaoPorEmail } from "@/lib/migracao";
import { ADMIN_EMAIL } from "@/lib/config";

export const REF_COOKIE = "foccus_ref_codigo";

export const googleConfigurado = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    ...(googleConfigurado
      ? [Google({ allowDangerousEmailAccountLinking: true })]
      : []),
  ],
  pages: {
    signIn: "/login",
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      await prisma.user.update({
        where: { id: user.id },
        data: { codigoIndicacao: buildCodigoIndicacao(user.name ?? user.email ?? "investidor") },
      });
      if (user.email) await vincularMigracaoPorEmail(user.id, user.email);

      const cookieStore = await cookies();
      const refCodigo = cookieStore.get(REF_COOKIE)?.value?.trim().toUpperCase();
      if (refCodigo) {
        const indicador = await prisma.user.findUnique({ where: { codigoIndicacao: refCodigo } });
        if (indicador && indicador.id !== user.id) {
          await prisma.user.update({ where: { id: user.id }, data: { indicadoPorId: indicador.id } });
        }
        cookieStore.delete(REF_COOKIE);
      }
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
        } else {
          // Conta não existe mais (excluída) — invalida o token pra não ficar preso num
          // loop de redirecionamento entre páginas que checam a sessão de formas diferentes.
          delete token.id;
          delete token.perfil;
          delete token.statusCadastro;
          delete token.codigoIndicacao;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.perfil = token.perfil as typeof session.user.perfil;
        session.user.statusCadastro = token.statusCadastro as typeof session.user.statusCadastro;
        session.user.codigoIndicacao = token.codigoIndicacao as string | null;
      } else {
        session.user = undefined as unknown as typeof session.user;
      }
      return session;
    },
  },
});
