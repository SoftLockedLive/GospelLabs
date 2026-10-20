import type { ComponentProps } from "react";
import { STATUS_LABELS, type InvestigationStatus } from "@/domain/investigation";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "amber" | "green";

const tones: Record<Tone, string> = {
  neutral: "border-line-strong text-muted",
  accent: "border-accent/30 bg-accent-soft text-accent",
  amber: "border-amber/30 bg-amber-soft text-amber",
  green: "border-green/30 bg-green-soft text-green",
};

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

const statusTones: Record<InvestigationStatus, Tone> = {
  investigating: "accent",
  "partially-understood": "amber",
  concluded: "green",
};

export function StatusBadge({ status, className }: { status: InvestigationStatus; className?: string }) {
  return (
    <Badge tone={statusTones[status]} className={className}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </Badge>
  );
}
