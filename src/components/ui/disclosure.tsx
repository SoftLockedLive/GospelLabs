import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface DisclosureProps {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  /** "card" has a border and surface; "plain" is a quiet inline toggle. */
  variant?: "card" | "plain";
  className?: string;
  /** Called with the new state when the learner opens or closes it. */
  onToggle?: (open: boolean) => void;
}

/**
 * Show-more content on native <details>/<summary>: keyboard operable,
 * announced as expanded/collapsed, and it works before scripts load.
 */
export function Disclosure({ summary, children, defaultOpen, variant = "card", className, onToggle }: DisclosureProps) {
  return (
    <details
      open={defaultOpen}
      onToggle={onToggle ? (event) => onToggle(event.currentTarget.open) : undefined}
      className={cn("group", variant === "card" && "rounded-xl border border-line bg-surface", className)}
    >
      <summary
        className={cn(
          "flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-fg select-none [&::-webkit-details-marker]:hidden",
          variant === "card" ? "rounded-xl px-4 py-3 hover:bg-surface-raised sm:px-5" : "rounded-lg py-2 text-accent hover:text-accent-strong",
        )}
      >
        <span className="min-w-0">{summary}</span>
        <ChevronDown
          aria-hidden
          className={cn("size-4 shrink-0 transition-transform duration-200 group-open:rotate-180", variant === "card" ? "text-subtle" : "text-current")}
        />
      </summary>
      <div className={cn("motion-reveal", variant === "card" ? "border-t border-line px-4 py-4 sm:px-5" : "pt-2")}>{children}</div>
    </details>
  );
}
