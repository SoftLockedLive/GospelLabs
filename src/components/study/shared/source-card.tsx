/**
 * A source as the learner sees it: citation, provenance badge, optional verse
 * text or excerpt, and a link to the original. Used everywhere sources appear
 * (investigation evidence, Explorer, Character of Christ, Connect, Notebook).
 */
import { ChevronDown, ExternalLink } from "lucide-react";
import type { Source } from "@/domain/study/content-schema";
import { cn } from "@/lib/cn";
import { SourceKindBadge } from "./provenance";

export function sourceHostLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host === "churchofjesuschrist.org") return "ChurchofJesusChrist.org";
    if (host === "speeches.byu.edu") return "BYU Speeches";
    return host;
  } catch {
    return "the original";
  }
}

/** Opens the original source in a new tab, sending no referrer. */
export function SourceLink({ source, className, children }: { source: Pick<Source, "url" | "label">; className?: string; children?: React.ReactNode }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex min-h-11 w-fit items-center gap-1.5 rounded-md text-sm text-accent hover:text-accent-strong hover:underline sm:min-h-0 sm:py-1",
        className,
      )}
    >
      {children ?? <>Read on {sourceHostLabel(source.url)}</>}
      <ExternalLink aria-hidden className="size-3.5" />
      <span className="sr-only">(opens {source.label} in a new tab)</span>
    </a>
  );
}

/** Verse text with verse numbers. Text is shown exactly as in the source. "lg" suits quiet reading (Connect with Christ). */
export function VerseText({ source, className, size = "md" }: { source: Source; className?: string; size?: "md" | "lg" }) {
  if (!source.verses?.length) return null;
  return (
    <div
      className={cn(
        "flex flex-col font-serif text-fg",
        size === "lg" ? "gap-3 text-[1.0625rem] leading-[1.8] sm:text-lg" : "gap-2 text-[0.975rem] leading-relaxed",
        className,
      )}
    >
      {source.verses.map((verse) => (
        <p key={verse.number}>
          <sup className="mr-1 font-sans text-[0.7rem] font-semibold text-subtle">{verse.number}</sup>
          {verse.text}
        </p>
      ))}
    </div>
  );
}

interface SourceCardProps {
  source: Source;
  /** Show verse text / excerpt (default true). */
  showText?: boolean;
  /** Tuck verse text / excerpt behind a "Read" disclosure, for pages that list many sources. */
  collapsibleText?: boolean;
  className?: string;
  headingLevel?: "h3" | "h4";
}

export function SourceCard({ source, showText = true, collapsibleText = false, className, headingLevel: Heading = "h3" }: SourceCardProps) {
  const text = showText ? <SourceText source={source} /> : null;
  return (
    <article className={cn("rounded-xl border border-line bg-surface p-4 sm:p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Heading className="text-sm font-semibold text-fg">{source.label}</Heading>
          {(source.title || source.author || source.publication) && (
            <p className="mt-0.5 text-xs text-muted">
              {[source.title && source.title !== source.label ? source.title : null, source.author, source.publication]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
        <SourceKindBadge kind={source.kind} />
      </div>
      {text &&
        (collapsibleText && (source.verses || source.excerpt) ? (
          // Native <details>: keyboard and screen-reader friendly, and works without JavaScript.
          <details className="group mt-3">
            <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1.5 rounded-md text-sm font-medium text-fg hover:text-accent sm:min-h-0 sm:py-1 [&::-webkit-details-marker]:hidden">
              <ChevronDown aria-hidden className="size-4 text-subtle transition-transform group-open:rotate-180" />
              {source.verses ? `Read the ${source.verses.length === 1 ? "verse" : `${source.verses.length} verses`}` : "Read the excerpt"}
            </summary>
            <div className="mt-1">{text}</div>
          </details>
        ) : (
          <div className="mt-3">{text}</div>
        ))}
      <SourceLink source={source} className="mt-2" />
    </article>
  );
}

/** Verse text, else a verbatim excerpt, else a neutral summary. */
function SourceText({ source }: { source: Source }) {
  if (source.verses) return <VerseText source={source} />;
  if (source.excerpt) {
    return (
      <blockquote className="border-l-2 border-line-strong pl-3 font-serif text-[0.975rem] leading-relaxed text-fg">
        “{source.excerpt}”
      </blockquote>
    );
  }
  if (source.summary) return <p className="text-sm leading-relaxed text-muted">{source.summary}</p>;
  return null;
}
