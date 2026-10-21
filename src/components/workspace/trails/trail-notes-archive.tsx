import { ChevronDown } from "lucide-react";
import type { TrailStepProgress } from "@/domain/investigation";

/**
 * Read-only notes whose trail step no longer exists (the trail was revised or
 * removed). They stay in the investigation and its backups; this keeps them visible.
 */
export function TrailNotesArchive({ heading, notes }: { heading: string; notes: readonly TrailStepProgress[] }) {
  const withText = notes.filter((note) => note.discoveries.trim() !== "");
  if (withText.length === 0) return null;

  return (
    <details className="group rounded-lg border border-line bg-surface-sunken/50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3.5 py-2.5 text-sm text-muted hover:text-fg [&::-webkit-details-marker]:hidden">
        {heading} ({withText.length})
        <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <ul className="flex flex-col divide-y divide-line border-t border-line">
        {withText.map((note) => (
          <li key={note.stepId} className="px-3.5 py-3 text-sm">
            <p className="font-medium break-words text-fg">{note.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-subtle">{note.question}</p>
            <p className="mt-2 leading-relaxed break-words whitespace-pre-line text-muted">{note.discoveries}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}
