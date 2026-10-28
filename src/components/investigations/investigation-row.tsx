import { ChevronRight, FileText } from "lucide-react";
import Link from "next/link";
import type { Investigation } from "@/domain/investigation";
import { getSection } from "@/domain/sections";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { investigationHref } from "@/lib/routes";

/** A single clickable research notebook summary, used on the dashboard and in the library. */
export function InvestigationRow({ investigation }: { investigation: Investigation }) {
  const section = getSection(investigation.currentSection);
  const evidenceCount = investigation.evidence.length;

  return (
    <Link
      href={investigationHref(investigation.id)}
      className="group flex items-center gap-4 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent/40 hover:bg-surface-raised sm:p-5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={investigation.status} />
          {investigation.category && (
            <span className="min-w-0 text-[13px] font-semibold break-words text-muted">{investigation.category}</span>
          )}
        </div>
        <p className="mt-2.5 font-medium break-words text-fg">{investigation.title.trim() || "Untitled notebook"}</p>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed break-words text-muted">{investigation.question}</p>
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-subtle">
          <div className="flex gap-1">
            <dt>Last edited</dt>
            <dd className="text-muted">{formatDate(investigation.updatedAt)}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Section</dt>
            <dd className="text-muted">
              {section.step}. {section.title}
            </dd>
          </div>
          <div className="flex items-center gap-1">
            <FileText aria-hidden className="size-3" />
            <dt className="sr-only">Evidence</dt>
            <dd className="text-muted">
              {evidenceCount} {evidenceCount === 1 ? "evidence card" : "evidence cards"}
            </dd>
          </div>
        </dl>
      </div>
      <ChevronRight
        aria-hidden
        className="size-5 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
      />
    </Link>
  );
}
