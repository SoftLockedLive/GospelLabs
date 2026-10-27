import { ArrowRight, Library, NotebookText } from "lucide-react";
import Link from "next/link";
import { ProvenanceLabel } from "@/components/study/shared/provenance";
import type { ResearchDiscovery } from "@/domain/study/notebook";
import { formatDate } from "@/lib/format";
import { investigationHref } from "@/lib/routes";

/**
 * Insights the learner saved inside their 1.x research notebooks. Shown
 * read-only for reference; they live in (and are edited from) those
 * notebooks, and don't feed the Discovery Map.
 */
/** Where the Notebook was scrolled when a research notebook was opened from it, so coming back returns there. */
export const NOTEBOOK_SCROLL_KEY = "gospel-labs:notebook-scroll";

function rememberScroll() {
  try {
    sessionStorage.setItem(NOTEBOOK_SCROLL_KEY, JSON.stringify({ y: window.scrollY, at: Date.now() }));
  } catch {
    // Storage blocked: coming back starts at the top, as before.
  }
}

export function ResearchDiscoveries({ entries, searching }: { entries: ResearchDiscovery[]; searching: boolean }) {
  return (
    <section aria-labelledby="research-discoveries-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h2 id="research-discoveries-heading" className="flex items-center gap-2 text-sm font-semibold text-fg">
            <NotebookText aria-hidden className="size-4 text-accent" />
            From your research notebooks
            <span className="font-normal text-subtle">({entries.length})</span>
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-subtle">
            Insights you saved in your research notebooks. They stay in those notebooks (open one to edit) and
            aren&rsquo;t added to your Map.
          </p>
        </div>
        <Link
          href="/library"
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg text-sm font-medium text-accent hover:text-accent-strong sm:min-h-0 sm:py-1"
        >
          <Library aria-hidden className="size-4" />
          My Library
        </Link>
      </div>
      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong px-4 py-3 text-sm text-muted">
          {searching ? "No saved insights match your search." : "No saved insights yet."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {entries.map(({ investigationId, investigationTitle, highlight }) => (
            <li key={`${investigationId}-${highlight.id}`} className="min-w-0">
              <article className="group relative flex h-full flex-col rounded-xl border border-line bg-surface/70 p-4 transition-colors hover:border-accent/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <ProvenanceLabel provenance="user" />
                  <time dateTime={highlight.createdAt} className="text-xs text-subtle">
                    {formatDate(highlight.createdAt)}
                  </time>
                </div>
                <h3 className="mt-2 text-sm font-medium break-words text-fg">
                  <Link
                    href={investigationHref(investigationId, "conclusion")}
                    onClick={rememberScroll}
                    className="rounded-sm after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-solid focus-visible:after:outline-offset-2 focus-visible:after:outline-accent group-hover:text-accent"
                  >
                    {highlight.title.trim() || "Untitled insight"}
                  </Link>
                </h3>
                {highlight.insight.trim() && (
                  <p className="mt-1 line-clamp-3 text-sm leading-relaxed break-words whitespace-pre-line text-muted">
                    {highlight.insight}
                  </p>
                )}
                <p className="mt-auto flex items-center gap-1.5 pt-3 text-xs text-subtle">
                  <span className="truncate">In “{investigationTitle}”</span>
                  <ArrowRight aria-hidden className="size-3.5 shrink-0" />
                </p>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
