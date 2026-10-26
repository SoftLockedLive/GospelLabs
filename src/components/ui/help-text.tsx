import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A short, always-visible explanation beside a control or section, in place
 * of a tooltip (tooltips hide information from touch and keyboard users).
 * Give it an id and reference it with aria-describedby when it explains a control.
 */
export function HelpText({ id, children, icon = true, className }: { id?: string; children: ReactNode; icon?: boolean; className?: string }) {
  return (
    <p id={id} className={cn("flex items-start gap-2 text-xs leading-relaxed text-subtle", className)}>
      {icon && <Info aria-hidden className="mt-px size-3.5 shrink-0" />}
      <span>{children}</span>
    </p>
  );
}
