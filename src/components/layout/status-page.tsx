import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface StatusPageProps {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  /** "danger" tints the icon for errors. */
  tone?: "accent" | "danger";
  className?: string;
}

/** A whole-page message (not found, offline, an error): calm, centered, with a clear way forward. */
export function StatusPage({ icon: Icon, title, description, actions, children, tone = "accent", className }: StatusPageProps) {
  return (
    <div className={cn("mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center sm:py-24", className)}>
      <span
        aria-hidden
        className={cn(
          "motion-reveal flex size-14 items-center justify-center rounded-2xl ring-1",
          tone === "danger" ? "bg-danger-soft text-danger ring-danger/25" : "bg-accent-soft text-accent ring-accent/20",
        )}
      >
        <Icon className="size-6" />
      </span>
      <h1 className="mt-6 font-serif text-[1.75rem] leading-tight font-medium tracking-tight text-balance text-fg sm:text-3xl">{title}</h1>
      <div className="mt-3 text-[15px] leading-relaxed text-muted">{description}</div>
      {actions && <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">{actions}</div>}
      {children}
    </div>
  );
}
