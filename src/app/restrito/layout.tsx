import { auth } from "@/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { liberarIncentivoAutomaticoSeNecessario } from "@/lib/incentivo-lideranca";

export default async function RestritoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isAdmin = session?.user?.perfil === "ADMIN";

  if (!isAdmin) return <>{children}</>;

  // Fallback do incentivo de liderança automático, verificado em TODA página administrativa
  // (não só Painel/Liderança) — maximiza a chance de disparar no mesmo dia, mesmo que o cron da
  // Vercel continue falhando. Idempotente, best-effort, nunca quebra a navegação.
  await liberarIncentivoAutomaticoSeNecessario().catch((e) =>
    console.error("Falha no fallback do incentivo de liderança automático:", e)
  );

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
