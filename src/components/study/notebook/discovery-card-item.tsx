import { Highlighter, Link2, NotebookPen, Quote } from "lucide-react";
import Link from "next/link";
import { ORIGIN_LABELS, splitConcepts } from "@/domain/study/notebook";
import type { DiscoveryCard } from "@/domain/study/user-data";
import { formatDate } from "@/lib/format";
import { notebookHref } from "@/lib/routes";
import { ConceptChip } from "./concept-chip";
import { ORIGIN_ICONS } from "./origin";

const MAX_CHIPS = 4;

export const cardLinkId = (cardId: string) => `notebook-card-${cardId}`;

/** One Discovery Card in the Notebook list. The whole card opens it. */
export function DiscoveryCardItem({ card }: { card: DiscoveryCard }) {
  const Icon = ORIGIN_ICONS[card.origin.kind];
  const { discovered, suggested } = splitConcepts(card);
  const chips = [...discovered, ...suggested];
  const shown = chips.slice(0, MAX_CHIPS);
  const headingId = `${cardLinkId(card.id)}-title`;

  return (
    <article
      aria-labelledby={headingId}
      className="group relative flex h-full flex-col rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent/40 hover:bg-surface-raised sm:p-5"
    >
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle">
        <span className="inline-flex items-center gap-1.5 font-medium text-muted">
          <Icon aria-hidden className="size-3.5 text-accent" />
          {ORIGIN_LABELS[card.origin.kind]}
        </span>
        <span aria-hidden>·</span>
        <time dateTime={card.createdAt}>{formatDate(card.createdAt)}</time>
      </p>
      <h3 id={headingId} className="mt-2 font-medium break-words text-fg">
        <Link
          id={cardLinkId(card.id)}
          href={notebookHref(card.id)}
          className="rounded-sm after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-solid focus-visible:after:outline-offset-2 focus-visible:after:outline-accent group-hover:text-accent"
        >
          {card.title}
        </Link>
      </h3>
      {card.question && <p className="mt-1 line-clamp-2 text-sm leading-relaxed break-words text-muted">{card.question}</p>}

      {shown.length > 0 && (
        <ul aria-label="Concepts" className="mt-3 flex flex-wrap gap-1.5">
          {shown.map((concept) => (
            <li key={concept.ref} className="max-w-full">
              <ConceptChip concept={concept} />
            </li>
          ))}
          {chips.length > shown.length && (
            <li className="self-center text-xs text-subtle">+{chips.length - shown.length} more</li>
          )}
        </ul>
      )}

      <dl className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-4 text-xs text-subtle">
        {card.sources.length > 0 && <Stat icon={Quote} term="Sources" value={card.sources.length} one="source" many="sources" />}
        {card.connections.length > 0 && (
          <Stat icon={Link2} term="Connections" value={card.connections.length} one="connection" many="connections" />
        )}
        {card.highlights.length > 0 && (
          <Stat icon={Highlighter} term="Highlights" value={card.highlights.length} one="highlight" many="highlights" />
        )}
        {card.notes.trim() && (
          <div className="inline-flex items-center gap-1">
            <NotebookPen aria-hidden className="size-3.5" />
            <dt className="sr-only">Notes</dt>
            <dd>Your notes</dd>
          </div>
        )}
      </dl>
    </article>
  );
}

function Stat({ icon: Icon, term, value, one, many }: { icon: typeof Quote; term: string; value: number; one: string; many: string }) {
  return (
    <div className="inline-flex items-center gap-1">
      <Icon aria-hidden className="size-3.5" />
      <dt className="sr-only">{term}</dt>
      <dd>
        <span className="text-muted">{value}</span> {value === 1 ? one : many}
      </dd>
    </div>
  );
}
