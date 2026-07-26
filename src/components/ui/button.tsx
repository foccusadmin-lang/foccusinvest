import { type ButtonHTMLAttributes, type AnchorHTMLAttributes } from "react";
import Link from "next/link";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none";

const variants = {
  gold: "bg-gradient-to-br from-[#f2d675] via-[#d4af37] to-[#93731f] text-black shadow-[0_8px_24px_-8px_rgba(212,175,55,0.6)] hover:brightness-110 active:brightness-95",
  outline:
    "border border-border bg-surface/50 text-foreground hover:border-gold/60 hover:text-gold-light",
  ghost: "text-muted hover:text-foreground",
};

type Variant = keyof typeof variants;

export function Button({
  variant = "gold",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function LinkButton({
  variant = "gold",
  className = "",
  href,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant;
  href: string;
}) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`} {...props} />
  );
}
