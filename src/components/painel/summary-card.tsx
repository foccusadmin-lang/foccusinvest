import { type ReactNode } from "react";

type Tone = "gold" | "green" | "blue" | "purple" | "neutral";

const tones: Record<Tone, { ring: string; glow: string; label: string; iconBg: string }> = {
  gold: {
    ring: "from-[#f2d675]/25 via-[#d4af37]/10 to-transparent",
    glow: "bg-[#d4af37]/20",
    label: "text-gold-light",
    iconBg: "bg-[#d4af37]/15 text-gold-light",
  },
  green: {
    ring: "from-emerald-400/25 via-emerald-500/10 to-transparent",
    glow: "bg-emerald-500/15",
    label: "text-emerald-300",
    iconBg: "bg-emerald-500/15 text-emerald-300",
  },
  blue: {
    ring: "from-sky-400/25 via-sky-500/10 to-transparent",
    glow: "bg-sky-500/15",
    label: "text-sky-300",
    iconBg: "bg-sky-500/15 text-sky-300",
  },
  purple: {
    ring: "from-violet-400/25 via-violet-500/10 to-transparent",
    glow: "bg-violet-500/15",
    label: "text-violet-300",
    iconBg: "bg-violet-500/15 text-violet-300",
  },
  neutral: {
    ring: "from-white/10 via-white/5 to-transparent",
    glow: "bg-white/5",
    label: "text-muted",
    iconBg: "bg-white/8 text-muted",
  },
};

export function SummaryCard({
  icon,
  label,
  value,
  hint,
  tone = "neutral",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
}) {
  const t = tones[tone];
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${t.ring} bg-surface p-5 transition-transform duration-200 hover:-translate-y-0.5`}
    >
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl ${t.glow}`}
      />
      <div className="relative flex items-start justify-between">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${t.iconBg}`}
        >
          {icon}
        </div>
        <span
          className={`text-[11px] font-semibold uppercase tracking-wider ${t.label}`}
        >
          {label}
        </span>
      </div>
      <p className="relative mt-4 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {hint && <p className="relative mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
