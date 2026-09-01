import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listarCampanhas } from "@/lib/plr-automatico";
import { getConfiguracao } from "@/lib/configuracao";
import { CampanhaForm } from "./campanha-form";
import { CampanhasLista } from "./campanhas-lista";

export default async function RestritoPlrAutomaticoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.perfil !== "ADMIN") redirect("/painel");

  const [campanhas, configuracao] = await Promise.all([listarCampanhas(), getConfiguracao()]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">PLR Automático</h1>
      <p className="mt-1 text-sm text-muted">
        Defina um percentual total, um período e um horário de lançamento — o sistema sorteia o
        cronograma diário na hora (mais nas sextas-feiras, menos nos fins de semana, um pouco de
        variação todo dia) e depois materializa cada dia sozinho. Importante: a checagem roda uma
        vez por dia, às 19h45 (horário de Brasília) — um horário de lançamento definido depois
        desse ponto só materializa no dia seguinte, não na hora exata configurada.
      </p>

      {configuracao.modoPLR === "MANUAL" && (
        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          O modo de lançamento de PLR está em <strong>Manual</strong> — mude pra Automático em{" "}
          <span className="font-semibold">Configurações do Sistema</span> pra essa campanha
          realmente ser lançada dia a dia. Enquanto estiver em Manual, o cronograma abaixo fica
          só planejado, sem gerar nenhuma Distribuição.
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          Nova campanha
        </p>
        <CampanhaForm />
      </div>

      <div className="mt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          Campanhas
        </p>
        <CampanhasLista campanhas={campanhas} />
      </div>
    </div>
  );
}
