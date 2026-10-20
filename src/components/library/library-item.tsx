import { ChevronDown, FileText, Trash2 } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import type { Investigation } from "@/domain/investigation";
import { getSection } from "@/domain/sections";
import { formatDate } from "@/lib/format";
import { investigationHref } from "@/lib/routes";

interface LibraryItemProps {
  investigation: Investigation;
  onDelete: () => void;
}

export function LibraryItem({ investigation, onDelete }: LibraryItemProps) {
  const title = investigation.title.trim() || "Untitled investigation";
  const section = getSection(investigation.currentSection);
  const { evidence } = investigation;
  const headingId = `library-item-${investigation.id}`;
  const resumeLabel = investigation.status === "concluded" ? "Reopen" : "Resume";

  return (
    <article aria-labelledby={headingId} className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={investigation.status} />
        {investigation.category && (
          <span className="font-mono text-[11px] tracking-wide text-subtle uppercase">{investigation.category}</span>
        )}
      </div>
      <h2 id={headingId} className="mt-2.5 font-medium text-fg">
        <Link href={investigationHref(investigation.id)} className="rounded-sm hover:text-accent">
          {title}
        </Link>
      </h2>
      {investigation.question && investigation.question !== title && (
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">{investigation.question}</p>
      )}
      <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-subtle">
        <div className="flex gap-1">
          <dt>Last edited</dt>
          <dd className="text-muted">{formatDate(investigation.updatedAt)}</dd>
        </div>
        <div className="flex gap-1">
          <dt>Left off at</dt>
          <dd className="text-muted">
            {section.step}. {section.title}
          </dd>
        </div>
      </dl>

      {evidence.length > 0 && (
        <details className="group mt-4 rounded-lg border border-line bg-surface-sunken/50">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3.5 py-2 text-sm text-muted hover:text-fg [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <FileText aria-hidden className="size-3.5 text-accent" />
              {evidence.length} evidence {evidence.length === 1 ? "card" : "cards"}
            </span>
            <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="flex flex-col gap-2.5 border-t border-line px-3.5 py-3">
            {evidence.map((card, index) => (
              <li key={card.id} className="text-sm">
                <span className="mr-2 font-mono text-xs text-accent">E{index + 1}</span>
                <span className="text-fg">{card.sourceTitle}</span>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-subtle">{card.observation}</p>
              </li>
            ))}
            <li>
              <Link
                href={investigationHref(investigation.id, "research")}
                className="inline-block rounded-sm py-1 text-xs text-accent hover:underline"
              >
                Open in Research
              </Link>
            </li>
          </ul>
        </details>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <ButtonLink
          href={investigationHref(investigation.id)}
          variant="secondary"
          size="sm"
          aria-label={`${resumeLabel} ${title}`}
        >
          {resumeLabel}
        </ButtonLink>
        <Button variant="ghost" size="sm" className="hover:text-danger" aria-label={`Delete ${title}`} onClick={onDelete}>
          <Trash2 aria-hidden />
          Delete
        </Button>
      </div>
    </article>
  );
}
