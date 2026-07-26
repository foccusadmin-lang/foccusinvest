import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function PosLoginPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.perfil === "ADMIN") redirect("/restrito");
  if (session.user.statusCadastro === "INCOMPLETO") redirect("/onboarding/cadastro");
  redirect("/painel");
}
