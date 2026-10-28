import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  /** Use 1 when the empty state is the whole page; otherwise the title is plain text. */
  headingLevel?: 1 | 2 | 3;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, headingLevel, description, action, className }: EmptyStateProps) {
  const Title = headingLevel ? (`h${headingLevel}` as const) : "p";
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl bg-surface-sunken px-6 py-12 text-center",
        className,
      )}
    >
      <Icon aria-hidden className="mb-3 size-7 text-muted" strokeWidth={1.5} />
      <Title className="font-serif text-xl font-medium text-fg">{title}</Title>
      {description && <p className="mt-2 max-w-sm text-[0.9375rem] leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
