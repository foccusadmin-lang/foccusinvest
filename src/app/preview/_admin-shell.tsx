import { AdminNav } from "@/components/admin/admin-nav";

/** Shell usado só pelas páginas de prévia (/preview/admin-*) pra reproduzir o layout real do
 *  admin (nav + container) sem precisar de sessão — igual ao que restrito/layout.tsx monta pra
 *  quem está logado como admin de verdade. */
export function AdminPreviewShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
