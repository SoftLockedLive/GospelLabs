"use client";

/**
 * The study panels beside the passage: themes, key words and phrases, and
 * context. Everything Gospel Labs wrote is labeled "Suggested by Gospel
 * Labs" and cites its sources; scripture text is always shown verbatim.
 */
import { ArrowRight, Crosshair, Eye, Highlighter } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { ProvenanceLabel } from "@/components/study/shared/provenance";
import { SourceCard, SourceLink } from "@/components/study/shared/source-card";
import type { ExplorerPassage, Source } from "@/domain/study/content-schema";
import { chapterLabel, formatVerseList, type ExplorerTheme } from "@/domain/study/explorer";
import { parseNodeRef } from "@/domain/study/vocabulary";
import { cn } from "@/lib/cn";
import { characterHref } from "@/lib/routes";
import { ThemeChip } from "./theme-chip";

type Sources = Readonly<Record<string, Source>>;

const lookup = (sources: Sources, ids: readonly string[]) => ids.map((id) => sources[id]).filter((s): s is Source => !!s);

// --- Themes ------------------------------------------------------------------------

interface ThemesPanelProps {
  passage: ExplorerPassage;
  themes: Readonly<Record<string, ExplorerTheme>>;
  /** The theme whose verses are emphasized. */
  active: string | null;
  onSelect: (conceptId: string | null) => void;
  /** How many of the learner's highlights carry each theme. */
  tagged: Readonly<Record<string, number>>;
}

export function ThemesPanel({ passage, themes, active, onSelect, tagged }: ThemesPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-muted">
        Choose a theme to see where it appears in the passage. When you save a highlight, you can tag it with a theme.
      </p>
      <ul className="flex flex-col gap-2.5">
        {passage.themes.map((item) => {
          const theme = themes[item.conceptId];
          if (!theme) return null;
          const selected = active === item.conceptId;
          const count = tagged[item.conceptId] ?? 0;
          return (
            <li key={item.conceptId} className={cn("rounded-xl border bg-surface transition-colors", selected ? "border-accent/50" : "border-line")}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(selected ? null : item.conceptId)}
                className="flex min-h-12 w-full flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 text-left hover:bg-surface-raised"
              >
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <ThemeChip label={theme.label} themeRef={theme.ref} className="text-sm" />
                  {count > 0 && (
                    <span className="text-xs text-subtle">
                      {count} highlight{count === 1 ? "" : "s"} tagged
                    </span>
                  )}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                  <Crosshair aria-hidden className={cn("size-3.5", selected && "text-accent")} />
                  {item.verses.length ? formatVerseList(item.verses) : "Whole passage"}
                </span>
              </button>
              {selected && (
                <div className="motion-reveal border-t border-line px-4 pt-3 pb-4">
                  <p className="text-sm leading-relaxed text-fg">{item.note}</p>
                  <ProvenanceLabel provenance="suggested" className="mt-2" />
                  {theme.description && (
                    <p className="mt-3 text-xs leading-relaxed text-subtle">
                      <span className="font-medium text-muted">{theme.label}:</span> {theme.description}
                    </p>
                  )}
                  {parseNodeRef(theme.ref)?.kind === "attribute" && (
                    <Link
                      href={characterHref(item.conceptId)}
                      className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-strong hover:underline sm:min-h-0 sm:py-1"
                    >
                      Study {theme.label.toLowerCase()} in Character of Christ
                      <ArrowRight aria-hidden className="size-3.5" />
                    </Link>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {active && (
        <Button variant="ghost" size="sm" className="h-11 self-start sm:h-8" onClick={() => onSelect(null)}>
          <Eye aria-hidden />
          Show the whole passage evenly
        </Button>
      )}
    </div>
  );
}

// --- Key words and phrases ----------------------------------------------------------------

interface KeyPhrasesPanelProps {
  passage: ExplorerPassage;
  sources: Sources;
  active: string | null;
  onShow: (phraseId: string | null) => void;
  onHighlight: (phraseId: string) => void;
}

export function KeyPhrasesPanel({ passage, sources, active, onShow, onHighlight }: KeyPhrasesPanelProps) {
  const reference = chapterLabel(sources[passage.sourceId]?.label ?? "");
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-muted">
        Significant words and phrases. Open one to see what it can mean and where else scripture uses it.
      </p>
      <ul className="flex flex-col gap-2.5">
        {passage.keyPhrases.map((phrase) => {
          const references = lookup(sources, phrase.sourceIds);
          return (
            <li key={phrase.id}>
              <Disclosure
                onToggle={(open) => {
                  if (open) onShow(phrase.id);
                  else if (active === phrase.id) onShow(null);
                }}
                summary={
                  <span className="flex flex-col gap-0.5">
                    <span className="prose-scripture text-[1rem] leading-snug text-fg">{phrase.phrase}</span>
                    <span className="font-mono text-[11px] font-normal tracking-wide text-subtle">
                      {reference}:{phrase.verse}
                    </span>
                  </span>
                }
              >
                <p className="text-sm leading-relaxed text-fg">{phrase.meaning}</p>
                <ProvenanceLabel provenance="suggested" className="mt-2" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" className="h-11 sm:h-9" onClick={() => onShow(phrase.id)} aria-pressed={active === phrase.id}>
                    <Eye aria-hidden />
                    Show in the passage
                  </Button>
                  <Button variant="secondary" size="sm" className="h-11 sm:h-9" onClick={() => onHighlight(phrase.id)}>
                    <Highlighter aria-hidden />
                    Highlight this phrase
                  </Button>
                </div>
                {references.length > 0 && (
                  <div className="mt-4">
                    <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Cross-references</h4>
                    <div className="flex flex-col gap-2.5">
                      {references.map((source) => (
                        <SourceCard key={source.id} source={source} headingLevel="h4" className="p-3.5 sm:p-4" />
                      ))}
                    </div>
                  </div>
                )}
              </Disclosure>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// --- Context -----------------------------------------------------------------------------

export function ContextPanel({ passage, sources }: { passage: ExplorerPassage; sources: Sources }) {
  const { setting, speaker, audience } = passage.context;
  const source = sources[passage.sourceId];
  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="context-heading" className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <h3 id="context-heading" className="text-sm font-semibold text-fg">
          Setting
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-fg">{setting}</p>
        {(speaker || audience) && (
          <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {speaker && (
              <div>
                <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Speaker</dt>
                <dd className="mt-1 leading-relaxed text-fg">{speaker}</dd>
              </div>
            )}
            {audience && (
              <div>
                <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Audience</dt>
                <dd className="mt-1 leading-relaxed text-fg">{audience}</dd>
              </div>
            )}
          </dl>
        )}
        <ProvenanceLabel provenance="suggested" className="mt-4" />
        <p className="mt-1 text-xs leading-relaxed text-subtle">
          Drawn from the verses and the chapter&rsquo;s introduction and summary.
          {source && (
            <>
              {" "}
              <SourceLink source={source} className="inline-flex text-xs">
                Read {chapterLabel(source.label)}
              </SourceLink>
            </>
          )}
        </p>
      </section>

      {passage.questions.length > 0 && (
        <section aria-labelledby="questions-heading">
          <h3 id="questions-heading" className="mb-1 text-sm font-semibold text-fg">
            Questions to investigate
          </h3>
          <p className="mb-3 text-sm leading-relaxed text-muted">Think about each question first, then open it to compare with the sources.</p>
          <ul className="flex flex-col gap-2.5">
            {passage.questions.map((question) => (
              <li key={question.id}>
                <Disclosure summary={question.question}>
                  <p className="text-sm leading-relaxed text-fg">{question.answer}</p>
                  <ProvenanceLabel provenance="suggested" className="mt-2" />
                  <ul aria-label="Sources" className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                    {lookup(sources, question.sourceIds).map((cited) => (
                      <li key={cited.id}>
                        <SourceLink source={cited}>{cited.label}</SourceLink>
                      </li>
                    ))}
                  </ul>
                </Disclosure>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

