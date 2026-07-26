import { auth } from "@/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function RestritoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isAdmin = session?.user?.perfil === "ADMIN";

  if (!isAdmin) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
