import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { listarRegioesAtivas } from "@/lib/marketplace/regioes";
import { RegiaoPicker } from "@/components/marketplace/regiao-picker";
import { SugerirBairroForm, SugestaoEnviadaBanner } from "@/components/marketplace/sugerir-bairro";
import { salvarRegioesPrestador } from "./actions";

export default async function PrestadorRegiaoPage({
  searchParams,
}: {
  searchParams: Promise<{ sugestaoEnviada?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/marketplace/prestador/regiao");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { perfilPrestador: { include: { regioesAtendidas: true } } },
  });
  if (!user) redirect("/login");
  if (user.papelMarketplace !== "PRESTADOR" || !user.perfilPrestador) redirect("/marketplace");

  const { sugestaoEnviada } = await searchParams;
  const regioes = await listarRegioesAtivas();
  const regioesOpcoes = regioes.map((r) => ({ id: r.id, nome: r.nome }));

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-8">
      {sugestaoEnviada && <SugestaoEnviadaBanner />}

      <div>
        <h1 className="text-2xl font-bold text-foreground">Onde você atende?</h1>
        <p className="mt-1 text-sm text-muted">📍 Jandira - SP</p>
      </div>

      <form action={salvarRegioesPrestador} className="flex flex-col gap-8">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Qual é o seu bairro?</h2>
          <p className="text-xs text-muted">Onde você mora — usado só como referência.</p>
          <div className="mt-3">
            <RegiaoPicker
              regioes={regioesOpcoes}
              name="regiaoPrincipalId"
              selecionadasIniciais={
                user.perfilPrestador.regiaoPrincipalId
                  ? [user.perfilPrestador.regiaoPrincipalId]
                  : []
              }
            />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Selecione onde você atende
          </h2>
          <p className="text-xs text-muted">
            Pode ser mais de um bairro — inclusive diferente de onde você mora.
          </p>
          <div className="mt-3">
            <RegiaoPicker
              regioes={regioesOpcoes}
              name="regiaoIds"
              multiplo
              selecionadasIniciais={user.perfilPrestador.regioesAtendidas.map((r) => r.regiaoId)}
            />
          </div>
        </div>

        <Button type="submit" variant="gold" className="w-full">
          Continuar
        </Button>
      </form>

      {/* Fora do form principal — <form> não pode ficar aninhado dentro de outro <form> */}
      <SugerirBairroForm voltarPara="/marketplace/prestador/regiao" />
    </div>
  );
}
