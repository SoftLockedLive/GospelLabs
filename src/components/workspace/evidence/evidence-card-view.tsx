import { ExternalLink, Link2, Pencil, Spline, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SOURCE_TYPE_LABELS, type EvidenceCard } from "@/domain/investigation";
import { formatDate } from "@/lib/format";
import { hostnameOf } from "./evidence-label";

interface EvidenceCardViewProps {
  card: EvidenceCard;
  label: string;
  citationCount: number;
  connectionCount: number;
  onEdit: () => void;
  onDelete: () => void;
  /** Starts a new connection from this card. Omitted when there's nothing to connect it to. */
  onConnect?: () => void;
}

export function EvidenceCardView({
  card,
  label,
  citationCount,
  connectionCount,
  onEdit,
  onDelete,
  onConnect,
}: EvidenceCardViewProps) {
  const headingId = `evidence-${card.id}`;

  return (
    <article
      id={`evidence-card-${card.id}`}
      tabIndex={-1}
      aria-labelledby={headingId}
      className="scroll-mt-40 rounded-xl border border-line bg-surface-sunken/60 p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 data-highlight:ring-2 data-highlight:ring-accent/60 sm:p-5"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold tabular-nums text-muted">{label}</span>
            <Badge>{SOURCE_TYPE_LABELS[card.sourceType]}</Badge>
            {citationCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-subtle">
                <Link2 aria-hidden className="size-3" />
                Cited by {citationCount} {citationCount === 1 ? "claim" : "claims"}
              </span>
            )}
            {connectionCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-subtle">
                <Spline aria-hidden className="size-3" />
                In {connectionCount} {connectionCount === 1 ? "connection" : "connections"}
              </span>
            )}
          </div>
          <h3 id={headingId} className="mt-2 font-medium break-words text-fg">
            {card.sourceTitle}
          </h3>
          {card.sourceUrl && (
            <a
              href={card.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-flex max-w-full items-center gap-1 rounded-sm py-1 text-xs text-accent hover:underline"
            >
              <span className="truncate">{hostnameOf(card.sourceUrl)}</span>
              <ExternalLink aria-hidden className="size-3 shrink-0" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          {onConnect && (
            <Button
              variant="ghost"
              size="sm"
              className="size-8 px-0"
              aria-label={`Connect ${label}: ${card.sourceTitle} to other evidence`}
              onClick={onConnect}
            >
              <Spline aria-hidden />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="size-8 px-0" aria-label={`Edit ${label}: ${card.sourceTitle}`} onClick={onEdit}>
            <Pencil aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="size-8 px-0 hover:text-danger"
            aria-label={`Delete ${label}: ${card.sourceTitle}`}
            onClick={onDelete}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      </header>

      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-subtle">Observation</dt>
          <dd className="mt-1 leading-relaxed whitespace-pre-line text-muted">{card.observation}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-subtle">Relevance</dt>
          <dd className="mt-1 leading-relaxed whitespace-pre-line text-muted">
            {card.relevance || <span className="text-subtle italic">Not noted yet</span>}
          </dd>
        </div>
      </dl>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {card.tags.length > 0 ? (
          <ul aria-label="Tags" className="flex flex-wrap gap-1.5">
            {card.tags.map((tag) => (
              <li key={tag} className="rounded-md bg-surface px-2 py-0.5 text-xs text-muted">
                #{tag}
              </li>
            ))}
          </ul>
        ) : (
          <span />
        )}
        <span className="text-xs text-subtle">
          Added {formatDate(card.createdAt)}
          {card.updatedAt !== card.createdAt && ` · edited ${formatDate(card.updatedAt)}`}
        </span>
      </footer>
    </article>
  );
}
