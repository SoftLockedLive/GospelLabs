import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface DashboardSectionProps {
  id: string;
  title: string;
  description?: ReactNode;
  /** A link or small control beside the heading. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A dashboard section: a calm heading, an optional line of context, and its content. */
export function DashboardSection({ id, title, description, action, children, className }: DashboardSectionProps) {
  const headingId = `${id}-heading`;
  return (
    <section aria-labelledby={headingId} className={cn("min-w-0", className)}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div className="min-w-0">
          <h2 id={headingId} className="text-heading text-fg">
            {title}
          </h2>
          {description && <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
