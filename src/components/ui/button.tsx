import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "soft" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "motion-press inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors select-none disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:cursor-not-allowed aria-disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-strong disabled:hover:bg-accent aria-disabled:hover:bg-accent",
  secondary:
    "border border-line-strong bg-surface text-fg hover:border-accent/50 hover:bg-surface-raised disabled:hover:border-line-strong disabled:hover:bg-surface",
  /** A quieter call to action: tinted, no border. */
  soft: "bg-accent-soft text-accent hover:bg-accent/20 disabled:hover:bg-accent-soft",
  ghost: "text-muted hover:bg-accent-soft hover:text-fg disabled:hover:bg-transparent disabled:hover:text-muted",
  danger:
    "border border-danger/40 text-danger hover:bg-danger-soft disabled:hover:bg-transparent",
};

/** md grows to 44px on touch screens; lg is always at least 48px. */
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm pointer-coarse:h-11",
  lg: "h-12 rounded-xl px-5 text-base",
};

interface StyleProps {
  variant?: Variant;
  size?: Size;
}

export function buttonClasses({ variant = "primary", size = "md" }: StyleProps = {}): string {
  return cn(base, variants[variant], sizes[size]);
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & StyleProps) {
  return <button type={type} className={cn(buttonClasses({ variant, size }), className)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={cn(buttonClasses({ variant, size }), className)} {...props} />;
}
