import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listarLideres, liberarIncentivoAutomaticoSeNecessario } from "@/lib/incentivo-lideranca";
import { PromoverLiderButton } from "./promover-lider-form";
import { LiderancaLista } from "./lideranca-lista";
import { LiberarIncentivoTodosButton } from "./liberar-incentivo-form";

export default async function RestritoLiderancaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  // Fallback do incentivo de liderança automático: se o Vercel Cron não disparou (CRON_SECRET
  // ausente, etc), garante que ainda assim é liberado quando o admin abre essa página depois das
  // 19h. Idempotente e best-effort — nunca deixa quebrar a página.
  await liberarIncentivoAutomaticoSeNecessario().catch((e) =>
    console.error("Falha no fallback do incentivo de liderança automático:", e)
  );

  const lideres = await listarLideres();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Liderança</h1>
          <p className="mt-1 text-sm text-muted">
            Líderes recebem, além da rentabilidade diária normal, um incentivo de 0,10% ao dia
            sobre o próprio capital. No modo automático (Painel administrativo), é liberado
            sozinho de segunda a sexta às 19h; no manual, use o botão "% Liberar incentivo pra
            todos" abaixo. Gerencie aqui quem é líder e o incentivo de cada um.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LiberarIncentivoTodosButton lideres={lideres} />
          <PromoverLiderButton />
        </div>
      </div>

      <div className="mt-6">
        <LiderancaLista lideres={lideres} />
      </div>
    </div>
  );
}
