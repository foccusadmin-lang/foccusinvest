import { TUTORIAIS } from "@/lib/tutoriais";
import { TutorialCard } from "@/components/painel/tutorial-card";
import { IconArrowLeft } from "@/components/icons";

export default function PreviewPainelTutorialPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/80 bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted">
            <IconArrowLeft width={16} height={16} />
          </span>
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-foreground">
              Tutorial
            </h1>
            <p className="text-xs text-muted">
              Vídeos explicativos sobre a Foccus Invest — compartilhe com quem ainda não conhece.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TUTORIAIS.map((t) => (
            <TutorialCard key={t.url} tutorial={t} />
          ))}
        </div>
      </main>
    </div>
  );
}
