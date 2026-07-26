import Image from "next/image";

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <Image
      src="/foccus-icon.png"
      alt="Foccus Invest"
      width={size}
      height={size}
      className="rounded-full"
      priority
    />
  );
}

export function Logo({
  size = 36,
  showTagline = false,
}: {
  size?: number;
  showTagline?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      <div className="shrink-0">
        <LogoMark size={size} />
      </div>
      <div className="flex min-w-0 flex-col leading-none">
        <span className="whitespace-nowrap font-[family-name:var(--font-display)] text-sm font-bold tracking-wide text-gold-gradient sm:text-lg">
          FOCCUS <span className="text-foreground/90">INVEST</span>
        </span>
        {showTagline && (
          <span className="mt-1 whitespace-nowrap text-[10px] uppercase tracking-[0.2em] text-muted">
            Investimento com propósito
          </span>
        )}
      </div>
    </div>
  );
}
