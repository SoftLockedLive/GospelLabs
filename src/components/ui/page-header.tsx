import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** A page's title: its one <h1>, in Literata, with an optional kicker above and a short description below. */
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl">
        {eyebrow && <Eyebrow className="mb-1.5">{eyebrow}</Eyebrow>}
        <h1 className="text-title text-fg">{title}</h1>
        {description && <p className="mt-3 text-base leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}

/**
 * The small line above a title: sentence case and muted (the `kicker` style). Monospace capitals in the accent
 * color were retired in 3.0, since the accent is only for things you can tap.
 */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("kicker text-muted", className)}>{children}</p>;
}

export function SectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-lg font-bold text-fg">{title}</h2>
      {action}
    </div>
  );
}
