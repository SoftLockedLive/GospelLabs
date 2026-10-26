"use client";

/**
 * Scripture Explorer for one passage: the verbatim text with highlighting,
 * study panels (themes, key words and phrases, related scriptures, context,
 * activities), a side-by-side comparison, and "Save to Notebook & Map".
 * Work is autosaved to the passage's Exploration on this device.
 */
import { ArrowLeft, BookOpenText, Highlighter, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { PageContainer } from "@/components/layout/app-shell";
import type { ActivityResult, ActivityState } from "@/components/study/activities/types";
import { SaveStatusText, StorageNotice } from "@/components/study/player/save-status";
import { ProvenanceLabel } from "@/components/study/shared/provenance";
import { SourceLink } from "@/components/study/shared/source-card";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/page-header";
import { LoadingRegion, SkeletonText } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import {
  activityStates,
  addHighlight,
  chapterLabel,
  findPhrase,
  overlaps,
  removeHighlight,
  updateHighlight,
  validHighlights,
  withActivityState,
  withHighlights,
  wordCount,
  wordRangeText,
  type ExplorerTheme,
  type PassageBundle,
  type StoredActivityState,
  type WordRange,
} from "@/domain/study/explorer";
import type { PassageHighlight } from "@/domain/study/user-data";
import { createId } from "@/lib/ids";
import { currentMotionLevel } from "@/lib/preferences";
import { explorerHref } from "@/lib/routes";
import { ActivitiesPanel } from "./activities-panel";
import { HighlightList, NewHighlight, type HighlightDraft } from "./highlights";
import { ContextPanel, KeyPhrasesPanel, ThemesPanel } from "./panels";
import { PassageText } from "./passage-text";
import { CompareView, RelatedPanel } from "./related-panel";
import { SaveDiscovery } from "./save-discovery";
import { ThemeChip } from "./theme-chip";
import { usePassageExploration } from "./use-passage-exploration";

type PanelId = "themes" | "words" | "related" | "context" | "activities";

const toStored = (state: ActivityState): StoredActivityState => ({
  attempts: state.attempts,
  hintsShown: state.hintsShown,
  revealed: state.revealed,
  completed: state.completed,
  ...(state.response !== undefined ? { response: state.response } : {}),
  ...(state.reflection !== undefined ? { reflection: state.reflection } : {}),
});

const isUntouched = (state: StoredActivityState) =>
  !state.attempts && !state.hintsShown && !state.revealed && !state.completed && state.response === undefined && !state.reflection;

export function PassageExplorer({ bundle }: { bundle: PassageBundle }) {
  const { passage, sources, themes } = bundle;
  const source = sources[passage.sourceId];
  const verses = source?.verses ?? [];
  const reference = source?.label ?? passage.title;

  const { exploration, ready, loadError, reload, status, update, flush, retry } = usePassageExploration(passage.id);
  const [selection, setSelection] = useState<WordRange | null>(null);
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const [activePhrase, setActivePhrase] = useState<string | null>(null);
  const [pointed, setPointed] = useState<WordRange | null>(null);
  const [comparing, setComparing] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelId>("themes");
  const [recentId, setRecentId] = useState<string | null>(null);
  // The new highlight's theme and note, shared by both Save buttons (the editor's and, on phones, the compact bar's).
  const [highlightDraft, setHighlightDraft] = useState<HighlightDraft>({ note: "" });
  const [message, setMessage] = useState("");
  const textRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const highlightsHeadingRef = useRef<HTMLHeadingElement>(null);

  const highlights = validHighlights(exploration?.highlights ?? [], verses);
  const verseText = (number: number) => verses.find((verse) => verse.number === number)?.text ?? "";
  const states = activityStates(exploration);
  const completed = exploration?.completedActivities ?? [];
  const tagged: Record<string, number> = {};
  for (const highlight of highlights) if (highlight.conceptId) tagged[highlight.conceptId] = (tagged[highlight.conceptId] ?? 0) + 1;

  const theme = passage.themes.find((t) => t.conceptId === activeTheme);
  const emphasizedVerses = theme ? new Set(theme.verses.length ? theme.verses : verses.map((verse) => verse.number)) : null;
  const phrase = passage.keyPhrases.find((p) => p.id === activePhrase);
  const phraseRange = phrase ? findPhrase(verseText(phrase.verse), phrase.phrase) : null;
  const emphasizedRange = pointed ?? (phrase && phraseRange ? { verse: phrase.verse, ...phraseRange } : null);

  const scrollToVerse = (verse: number) =>
    textRef.current?.querySelector(`[data-verse="${verse}"]`)?.scrollIntoView({ block: "center" });

  const announce = (text: string) => setMessage(text);

  function changeSelection(next: WordRange | null) {
    setSelection(next);
    setPointed(null);
    // Clearing the selection closes the editor and discards its draft, as before it was shared.
    if (!next) setHighlightDraft({ note: "" });
    if (next) {
      const count = next.end - next.start;
      announce(`${count} word${count === 1 ? "" : "s"} selected in verse ${next.verse}.`);
    } else announce("Selection cleared.");
  }

  function saveHighlight(draft: HighlightDraft) {
    if (!selection) return;
    const range = selection;
    let savedId = "";
    const saved = update(
      (current, now) => {
        const incoming: PassageHighlight = {
          id: createId(),
          verse: range.verse,
          start: range.start,
          end: range.end,
          ...(draft.conceptId ? { conceptId: draft.conceptId } : {}),
          note: draft.note.trim(),
          createdAt: now,
        };
        const next = addHighlight(current.highlights, incoming);
        savedId = next.find((h) => overlaps(h, incoming))?.id ?? incoming.id;
        return withHighlights(current, next, now);
      },
      { immediate: true },
    );
    // Saved highlights couldn't be read (see loadError): keep the selection and note on screen.
    if (!saved) return announce("Your highlight wasn’t saved, because your saved highlights can’t be read right now.");
    setRecentId(savedId);
    setSelection(null);
    setHighlightDraft({ note: "" });
    const themeLabel = draft.conceptId ? themes[draft.conceptId]?.label : undefined;
    announce(`Highlight saved${themeLabel ? `, tagged ${themeLabel}` : ""}.`);
  }

  function editHighlight(id: string, draft: HighlightDraft) {
    update((current, now) => withHighlights(current, updateHighlight(current.highlights, id, { conceptId: draft.conceptId ?? null, note: draft.note.trim() }), now), {
      immediate: true,
    });
    announce("Highlight updated.");
  }

  function deleteHighlight(id: string) {
    update((current, now) => withHighlights(current, removeHighlight(current.highlights, id), now), { immediate: true });
    if (recentId === id) setRecentId(null);
    // The removed item had focus; continue from the list's heading.
    highlightsHeadingRef.current?.focus();
    announce("Highlight removed.");
  }

  function showHighlight(highlight: PassageHighlight) {
    setSelection(null);
    setPointed({ verse: highlight.verse, start: highlight.start, end: highlight.end });
    scrollToVerse(highlight.verse);
  }

  function selectTheme(conceptId: string | null) {
    setActiveTheme(conceptId);
    const selected = passage.themes.find((t) => t.conceptId === conceptId);
    if (selected?.verses[0]) scrollToVerse(selected.verses[0]);
    announce(conceptId && themes[conceptId] ? `Showing where ${themes[conceptId].label} appears.` : "Showing the whole passage.");
  }

  function showPhrase(id: string | null) {
    setActivePhrase(id);
    setPointed(null);
    const found = passage.keyPhrases.find((p) => p.id === id);
    if (found) scrollToVerse(found.verse);
  }

  function highlightPhrase(id: string) {
    const found = passage.keyPhrases.find((p) => p.id === id);
    const range = found ? findPhrase(verseText(found.verse), found.phrase) : null;
    if (!found || !range) return;
    changeSelection({ verse: found.verse, ...range });
    // Once the new-highlight panel has rendered, bring it into view and move focus to its note.
    requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ block: "nearest" });
      editorRef.current?.querySelector<HTMLElement>("textarea")?.focus({ preventScroll: true });
    });
  }

  function activityChanged(activityId: string, state: ActivityState) {
    const next = toStored(state);
    const previous = states[activityId];
    if (previous ? JSON.stringify(previous) === JSON.stringify(next) : isUntouched(next)) return;
    // Typing a reflection waits for a pause; choosing an answer or asking for a hint is saved at once.
    const typing = (next.reflection ?? "") !== (previous?.reflection ?? "");
    update((current, now) => withActivityState(current, activityId, next, now), { immediate: !typing });
  }

  function activityCompleted(activityId: string, result: ActivityResult) {
    update(
      (current, now) =>
        withActivityState(
          current,
          activityId,
          {
            ...(activityStates(current)[activityId] ?? {}),
            attempts: result.attempts,
            hintsShown: result.hintsShown,
            revealed: result.revealed,
            completed: !result.skipped,
            ...(result.response !== undefined ? { response: result.response } : {}),
            ...(result.reflection !== undefined ? { reflection: result.reflection } : {}),
          },
          now,
        ),
      { immediate: true },
    );
    announce(result.revealed ? "Answer shown. The activity is marked complete." : "Activity complete.");
  }

  const selectedText = selection ? wordRangeText(verseText(selection.verse), selection.start, selection.end) : "";

  return (
    <PageContainer className="flex flex-col gap-8">
      <Link
        href={explorerHref()}
        className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-md text-sm text-muted transition-colors hover:text-fg sm:min-h-0 sm:py-1"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Scripture Explorer
      </Link>

      <header className="max-w-3xl">
        <Eyebrow>Scripture Explorer</Eyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{passage.title}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-muted">
          <span className="font-medium text-fg">{reference}</span>
          {passage.context.speaker && (
            <>
              <span aria-hidden>·</span>
              <span>{passage.context.speaker}</span>
            </>
          )}
        </p>
        <ul aria-label="Themes" className="mt-3 flex flex-wrap gap-1.5">
          {passage.themes.map((t) => themes[t.conceptId] && (
            <li key={t.conceptId}>
              <ThemeChip label={themes[t.conceptId].label} themeRef={themes[t.conceptId].ref} />
            </li>
          ))}
        </ul>
      </header>

      {loadError && <LoadErrorNotice message={loadError} onRetry={reload} />}
      {status.state === "error" && <StorageNotice message={status.message} onRetry={retry} />}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,6fr)] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="passage-heading" className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 id="passage-heading" className="flex items-center gap-2 text-sm font-semibold text-fg">
                <BookOpenText aria-hidden className="size-4 text-accent" />
                {reference}
              </h2>
              <SaveStatusText status={status} />
            </div>
            <p className="mb-4 flex items-start gap-2 text-xs leading-relaxed text-subtle">
              <Highlighter aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              Tap words to select a phrase, then save it as a highlight. Tap the first or last word again to shorten it.
            </p>
            <div ref={textRef}>
              <PassageText
                source={source}
                highlights={highlights}
                selection={selection}
                onSelectionChange={changeSelection}
                emphasizedVerses={emphasizedVerses}
                emphasizedRange={emphasizedRange}
                recentHighlightId={recentId}
                disabled={!ready}
              />
            </div>
            <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-subtle">
              Shown word for word from {reference}.{" "}
              {source && (
                <SourceLink source={source} className="inline-flex text-xs">
                  Read all of {chapterLabel(reference)} on ChurchofJesusChrist.org
                </SourceLink>
              )}
            </p>
          </section>

          {selection && (
            // Beside the passage on large screens it stays in reach while selecting. On smaller screens it is taller
            // than half the screen, so keeping it on top would cover the words being selected (and push Save
            // under the tab bar); there it follows the passage instead.
            <div ref={editorRef} className="lg:sticky lg:bottom-6 lg:z-10">
              <NewHighlight
                text={selectedText}
                verse={selection.verse}
                reference={reference}
                themes={passage.themes.map((t) => themes[t.conceptId]).filter((t): t is ExplorerTheme => !!t)}
                isWholeVerse={selection.start === 0 && selection.end === wordCount(verseText(selection.verse))}
                draft={highlightDraft}
                onDraftChange={setHighlightDraft}
                onSave={saveHighlight}
                onWholeVerse={() => changeSelection({ verse: selection.verse, start: 0, end: wordCount(verseText(selection.verse)) })}
                onClear={() => changeSelection(null)}
              />
            </div>
          )}

          {selection && (
            // Below lg the full editor follows the passage, so a compact bar above the tab bar keeps Save in reach
            // while selecting. Theme and note stay optional: "Theme or note" moves to the full editor, and this
            // Save saves whatever was chosen and written there.
            <>
              <div aria-hidden className="h-16 lg:hidden" />
              <div className="motion-reveal fixed inset-x-0 bottom-[calc(3.5rem+1px+env(safe-area-inset-bottom))] z-30 border-t border-line-strong bg-surface/95 px-4 py-2 backdrop-blur-md lg:hidden">
                <div className="mx-auto flex max-w-3xl items-center gap-2">
                  <p className="min-w-0 flex-1 truncate font-serif text-sm text-fg">
                    <span className="sr-only">Selected: </span>“{selectedText}”
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      editorRef.current?.scrollIntoView({ block: "center", behavior: currentMotionLevel() === "off" ? "auto" : "smooth" });
                      editorRef.current?.querySelector<HTMLElement>("input, textarea, button")?.focus({ preventScroll: true });
                    }}
                  >
                    Theme or note
                  </Button>
                  <Button size="sm" onClick={() => saveHighlight(highlightDraft)}>
                    Save
                  </Button>
                </div>
              </div>
            </>
          )}

          <section aria-labelledby="highlights-heading">
            <h2
              id="highlights-heading"
              ref={highlightsHeadingRef}
              tabIndex={-1}
              className="mb-3 flex items-baseline gap-2 text-sm font-semibold text-fg focus:outline-none"
            >
              Your highlights
              {highlights.length > 0 && <span className="font-mono text-xs font-normal text-subtle">{highlights.length}</span>}
            </h2>
            {loadError && !ready ? (
              <p className="text-sm text-muted">Your highlights can&rsquo;t be shown until your saved work can be read.</p>
            ) : !ready ? (
              <LoadingRegion label="Loading your highlights">
                <SkeletonText lines={2} />
              </LoadingRegion>
            ) : (
            <HighlightList
              items={highlights.map((highlight) => ({ highlight, text: wordRangeText(verseText(highlight.verse), highlight.start, highlight.end) }))}
              reference={reference}
              themes={themes}
              recentId={recentId}
              onUpdate={editHighlight}
              onRemove={deleteHighlight}
              onShow={showHighlight}
            />
            )}
          </section>
        </div>

        <div className="min-w-0">
          <Tabs<PanelId>
            label="Explore this passage"
            value={panel}
            onChange={setPanel}
            items={[
              {
                value: "themes",
                label: "Themes",
                panel: <ThemesPanel passage={passage} themes={themes} active={activeTheme} onSelect={selectTheme} tagged={tagged} />,
              },
              {
                value: "words",
                label: "Key words",
                panel: (
                  <KeyPhrasesPanel passage={passage} sources={sources} active={activePhrase} onShow={showPhrase} onHighlight={highlightPhrase} />
                ),
              },
              {
                value: "related",
                label: "Related",
                panel: <RelatedPanel passage={passage} sources={sources} comparing={comparing} onCompare={setComparing} />,
              },
              { value: "context", label: "Context", panel: <ContextPanel passage={passage} sources={sources} /> },
              {
                value: "activities",
                label: "Activities",
                badge: passage.activities.length ? `${completed.filter((id) => passage.activities.some((a) => a.id === id)).length}/${passage.activities.length}` : undefined,
                // Activities mount once saved progress has loaded, so they can restore it.
                panel: loadError && !ready ? (
                  <p className="text-sm text-muted">Activities open once your saved work on this passage can be read.</p>
                ) : ready ? (
                  <ActivitiesPanel
                    passage={passage}
                    sources={sources}
                    states={states}
                    completed={completed}
                    onStateChange={activityChanged}
                    onComplete={activityCompleted}
                  />
                ) : (
                  <LoadingRegion label="Loading your activities">
                    <SkeletonText lines={4} />
                  </LoadingRegion>
                ),
              },
            ]}
          />
        </div>
      </div>

      {comparing && <CompareView passage={passage} sources={sources} sourceId={comparing} onClose={() => setComparing(null)} />}

      <SaveDiscovery bundle={bundle} exploration={exploration} explorationReady={ready} beforeSave={flush} />

      <p className="text-xs leading-relaxed text-subtle">
        Explanations marked <ProvenanceLabel provenance="suggested" className="align-middle" /> are written by Gospel Labs from the cited
        sources. They aren&rsquo;t scripture or official doctrine; read the sources and decide for yourself.
      </p>

      <p aria-live="polite" className="sr-only">
        {message}
      </p>
    </PageContainer>
  );
}

/**
 * The learner's saved work on this passage couldn't be read. Reading still works; highlighting and
 * activities wait, since saving now could replace what is stored.
 */
function LoadErrorNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-2.5 rounded-xl border border-amber/40 bg-amber-soft px-4 py-3 text-sm text-fg sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2 leading-relaxed">
        <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-amber" />
        <span>
          <strong className="font-semibold">Your highlights and activities can&rsquo;t be opened right now.</strong> {message} You can still read
          the passage and its study panels. Nothing is changed until your saved work can be read.
        </span>
      </p>
      <Button variant="secondary" size="sm" onClick={onRetry} className="shrink-0 self-start sm:self-center">
        Try again
      </Button>
    </div>
  );
}
