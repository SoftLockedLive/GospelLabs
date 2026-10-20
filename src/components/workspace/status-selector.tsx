"use client";

import { INVESTIGATION_STATUSES, STATUS_LABELS, type InvestigationStatus } from "@/domain/investigation";
import { cn } from "@/lib/cn";

const DESCRIPTIONS: Record<InvestigationStatus, string> = {
  investigating: "Still gathering and thinking.",
  "partially-understood": "Some clarity, with open questions.",
  concluded: "Reached an understanding for now. You can still edit.",
};

const selectedStyles: Record<InvestigationStatus, string> = {
  investigating: "border-accent/60 bg-accent-soft",
  "partially-understood": "border-amber/60 bg-amber-soft",
  concluded: "border-green/60 bg-green-soft",
};

interface StatusSelectorProps {
  value: InvestigationStatus;
  onChange: (status: InvestigationStatus) => void;
}

export function StatusSelector({ value, onChange }: StatusSelectorProps) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-fg">Status</legend>
      <p className="mt-1 text-xs text-subtle">You decide when an investigation feels complete.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {INVESTIGATION_STATUSES.map((status) => {
          const selected = value === status;
          return (
            <label
              key={status}
              className={cn(
                "cursor-pointer rounded-lg border px-3.5 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                selected ? selectedStyles[status] : "border-line-strong hover:border-accent/40",
              )}
            >
              <input
                type="radio"
                name="investigation-status"
                value={status}
                checked={selected}
                onChange={() => onChange(status)}
                className="sr-only"
              />
              <span className={cn("block text-sm font-medium", selected ? "text-fg" : "text-muted")}>
                {STATUS_LABELS[status]}
              </span>
              <span className={cn("mt-0.5 block text-xs leading-relaxed", selected ? "text-muted" : "text-subtle")}>
                {DESCRIPTIONS[status]}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
