import type { PerfilUsuario, StatusCadastro } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      perfil: PerfilUsuario;
      statusCadastro: StatusCadastro;
      codigoIndicacao: string | null;
    } & DefaultSession["user"];
  }
}
