import { Logo } from "@/components/logo";
import { RedefinirForm } from "./redefinir-form";

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8">
        <div className="flex justify-center">
          <Logo size={44} showTagline />
        </div>

        <h1 className="mt-8 text-center text-xl font-semibold text-foreground">
          Redefinir senha
        </h1>

        <div className="mt-8">
          {token ? (
            <RedefinirForm token={token} />
          ) : (
            <p className="text-center text-sm text-red-400">
              Link inválido. Solicite uma nova recuperação de senha.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
