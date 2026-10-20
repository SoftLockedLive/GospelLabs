import { SECTIONS } from "@/domain/sections";

/** Static explainer of the five investigation stages. */
export function ProcessOverview() {
  return (
    <ol className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-5">
      {SECTIONS.map((section) => (
        <li key={section.id} className="bg-surface p-4 sm:p-5">
          <span className="font-mono text-xs text-accent">0{section.step}</span>
          <p className="mt-2 text-sm font-semibold text-fg">{section.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{section.summary}</p>
        </li>
      ))}
    </ol>
  );
}
