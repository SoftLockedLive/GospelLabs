"use client";

/**
 * A guided investigation: Question → Evidence → Interactive Discovery →
 * Understanding → Saved Discovery. Three views share one session:
 *
 *   overview  the question, what it rests on, and how to study it (start/resume)
 *   study     the steps, with progress saved as the learner goes
 *   complete  the discovery, saved as a Discovery Card (re-completing updates it)
 *
 * Leaving the overview adds a browser history entry (#study or #complete), so
 * Back (or a back swipe) returns to the overview instead of leaving the
 * investigation. Progress is saved either way.
 *
 * Everything it needs from content arrives as one bundle from the server
 * page, so the investigation works offline and without any AI.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { LoadingRegion, Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { buildInvestigationCard } from "@/domain/study/cards/investigation";
import { labelsLookup, type InvestigationBundle } from "@/domain/study/engine/bundle";
import { recommendDifficulty } from "@/domain/study/engine/difficulty";
import { completionState } from "@/domain/study/engine/status";
import type { DiscoveryCard, StudyProgress } from "@/domain/study/user-data";
import { getStudyAssistant } from "@/lib/assist";
import { createId } from "@/lib/ids";
import { usePreferences } from "@/lib/preferences";
import { getStudyRepository } from "@/persistence/client";
import { toStorageError } from "@/persistence/storage-errors";
import { useStudyProgressList } from "@/persistence/study-hooks";
import { CompletionView } from "./completion-view";
import { saveCompletion as storeCompletion } from "./progress-storage";
import { StartScreen } from "./start-screen";
import { StudyView } from "./study-view";
import { useSaver } from "./use-saver";
import { useStudySession } from "./use-study-session";

type View = "overview" | "study" | "complete";

const saveCard = (card: DiscoveryCard) => getStudyRepository().discoveries.put(card);

/** A note typed on a card that wasn't saved yet is kept when the card is merged into one saved meanwhile. */
const joinNotes = (saved: string, typed: string) => (!typed || typed === saved ? saved : saved ? `${saved}\n\n${typed}` : typed);

export function InvestigationPlayer({ bundle }: { bundle: InvestigationBundle }) {
  const { investigation } = bundle;
  const session = useStudySession(investigation);
  const preferences = usePreferences();
  const allProgress = useStudyProgressList();
  const { saver: cardSaver, status: noteStatus } = useSaver<DiscoveryCard>(saveCard);
  const [view, setView] = useState<View>("overview");
  const [discovery, setDiscovery] = useState<{ card: DiscoveryCard; saved: boolean } | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<ReadonlySet<string>>(() => new Set());
  const [dismissedBranches, setDismissedBranches] = useState<ReadonlySet<string>>(() => new Set());
  const firstView = useRef(true);
  /** This visit added a history entry for a study or completion view, which Back (or "Overview") undoes. */
  const pushedView = useRef(false);
  /** Arrived with ?resume (the dashboard's "Continue studying"): go straight back to the step once progress loads. */
  const [resuming, setResuming] = useState(false);

  // Back from a step or the discovery: the history entry is gone, so show the overview.
  useEffect(() => {
    // ?resume (from the dashboard) goes straight to the step, below. A #study or #complete left by this page
    // (a reload, a shared link) starts at the overview, like any visit. Either way the address is cleaned up.
    // Read here, not while rendering: after a client-side navigation the address updates only after the first render.
    const resume = new URLSearchParams(window.location.search).has("resume");
    if (resume || window.location.hash) window.history.replaceState(null, "", window.location.pathname);
    if (resume) queueMicrotask(() => setResuming(true));
    const onPopState = () => {
      if (window.location.hash) return;
      pushedView.current = false;
      setView("overview");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  /** Changes view, keeping one history entry for "away from the overview". */
  function show(next: View) {
    if (next === "overview") {
      if (pushedView.current) window.history.back();
      else setView("overview");
      return;
    }
    const url = `${window.location.pathname}${window.location.search}#${next}`;
    if (pushedView.current) window.history.replaceState(null, "", url);
    else {
      window.history.pushState(null, "", url);
      pushedView.current = true;
    }
    setView(next);
  }

  const assistant = useMemo(
    () => getStudyAssistant(Object.values(bundle.concepts).map((concept) => ({ term: concept.label, description: concept.description }))),
    [bundle],
  );
  const progress = session.progress;

  const suggestion = useMemo(() => {
    if (!progress || !preferences.activity.suggestDifficulty) return null;
    const others = allProgress.status === "ready" ? allProgress.value.records.filter((record) => record.id !== progress.id) : [];
    const found = recommendDifficulty([...others, progress], progress.difficulty);
    return found && !dismissedSuggestions.has(`${found.from}>${found.difficulty}`) ? found : null;
  }, [progress, preferences.activity.suggestDifficulty, allProgress, dismissedSuggestions]);

  // A new view starts at the top, with focus on its heading (the step view focuses its own).
  useEffect(() => {
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    if (view === "study") return;
    window.scrollTo({ top: 0 });
    document.querySelector<HTMLElement>("[data-view-heading] h1")?.focus({ preventScroll: true });
  }, [view]);

  // "Continue studying" from the dashboard: straight back to the step once progress has loaded (not when
  // there's nothing to resume, it's finished, or it can't be saved: the overview explains those).
  useEffect(() => {
    if (!resuming || progress === undefined) return;
    const frame = requestAnimationFrame(() => {
      setResuming(false);
      if (progress && !progress.completedAt && !session.blocked && session.start({ difficulty: progress.difficulty, length: progress.length })) {
        show("study");
      }
    });
    return () => cancelAnimationFrame(frame);
    // Runs when progress first loads; `show` and `session` are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resuming, progress]);

  // Still loading, or about to go straight to the step (so the overview doesn't flash first).
  if (progress === undefined || resuming) {
    return (
      <LoadingRegion label="Loading your progress" className="mx-auto flex max-w-3xl flex-col gap-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-3/4" />
        <SkeletonText lines={3} />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </LoadingRegion>
    );
  }

  function buildCard(record: StudyProgress, existing: DiscoveryCard | undefined): DiscoveryCard {
    return buildInvestigationCard({
      investigation,
      progress: record,
      sources: bundle.sources,
      labelFor: labelsLookup(bundle.labels),
      conceptRef: (id) => bundle.concepts[id]?.ref ?? `concept:${id}`,
      id: createId(),
      now: new Date().toISOString(),
      existing,
    });
  }

  /**
   * The card to update: the one this progress links to, else one already saved from this investigation (by
   * another tab, or before the link was lost), so finishing never makes a duplicate. A failed read is thrown,
   * never taken to mean "no card".
   */
  async function existingCard(record: StudyProgress): Promise<DiscoveryCard | undefined> {
    const repository = getStudyRepository();
    const linked = record.discoveryId ? await repository.discoveries.get(record.discoveryId) : undefined;
    return linked ?? (await repository.findDiscoveryByOrigin("investigation", investigation.id));
  }

  /** Studying without saving: the discovery is shown for this visit only, with the reason. */
  function showUnsaved(record: StudyProgress, reason: string) {
    setDiscovery({ card: buildCard(record, undefined), saved: false });
    setCompletionError(reason);
  }

  /**
   * Saves the progress and its card together, updating the card already saved for this investigation if
   * there is one. `draft` is the card shown so far (with any note typed on it). On failure both stay in
   * memory and the error is shown; retrying looks the card up again.
   */
  async function saveCompletion(record: StudyProgress, draft?: DiscoveryCard) {
    try {
      const existing = await existingCard(record);
      const built = buildCard(record, existing ?? draft);
      const card = existing && draft ? { ...built, notes: existing.id === draft.id ? draft.notes : joinNotes(existing.notes, draft.notes) } : built;
      const saved = await storeCompletion(getStudyRepository(), record, card);
      session.adopt(saved.progress);
      cardSaver.markSaved(saved.card);
      setDiscovery({ card: saved.card, saved: true });
      setCompletionError(null);
    } catch (error) {
      setDiscovery({ card: draft ?? buildCard(record, undefined), saved: false });
      setCompletionError(toStorageError(error).message);
    }
  }

  async function finish() {
    if (finishing) return;
    setFinishing(true);
    try {
      const finished = session.dispatch({ type: "finish" });
      if (!finished || !completionState(investigation, finished).complete) return;
      if (session.unsaved) showUnsaved(finished, session.unsaved);
      else {
        // Pending writes go first, so nothing older lands after the completed record.
        await Promise.all([session.flush(), cardSaver.flush()]);
        await saveCompletion(finished);
      }
      show("complete");
    } finally {
      setFinishing(false);
    }
  }

  async function review() {
    if (!progress) return;
    if (session.unsaved) showUnsaved(progress, session.unsaved);
    else {
      await cardSaver.flush();
      try {
        const existing = await existingCard(progress);
        setDiscovery(existing ? { card: existing, saved: true } : { card: buildCard(progress, undefined), saved: false });
        setCompletionError(null);
      } catch (error) {
        // Shown from this visit, with the error and a retry (which looks the card up again before saving).
        setDiscovery({ card: buildCard(progress, undefined), saved: false });
        setCompletionError(toStorageError(error).message);
      }
    }
    show("complete");
  }

  function onNoteChange(notes: string) {
    if (!discovery) return;
    const card = { ...discovery.card, notes, updatedAt: new Date().toISOString() };
    setDiscovery({ ...discovery, card });
    if (discovery.saved) cardSaver.update(card);
  }

  if (view === "complete" && discovery && progress) {
    return (
      <div data-view-heading>
        <CompletionView
          investigation={investigation}
          progress={progress}
          card={discovery.card}
          saved={discovery.saved}
          saveError={completionError}
          onSaveCard={
            session.unsaved
              ? undefined
              : () => void saveCompletion({ ...progress, completedAt: progress.completedAt ?? new Date().toISOString() }, discovery.card)
          }
          noteStatus={noteStatus}
          onNoteChange={onNoteChange}
          onReviewSteps={() => show("study")}
          assistant={assistant}
        />
      </div>
    );
  }

  if (view === "study" && progress) {
    return (
      <StudyView
        bundle={bundle}
        progress={progress}
        session={session}
        onOverview={() => show("overview")}
        preferences={preferences}
        assistant={assistant}
        onFinish={() => void finish()}
        finishing={finishing}
        suggestion={suggestion}
        onAcceptSuggestion={() => suggestion && session.dispatch({ type: "setDifficulty", difficulty: suggestion.difficulty })}
        onDismissSuggestion={() => suggestion && setDismissedSuggestions((current) => new Set(current).add(`${suggestion.from}>${suggestion.difficulty}`))}
        dismissedBranches={dismissedBranches}
        onDismissBranch={(id) => setDismissedBranches((current) => new Set(current).add(id))}
      />
    );
  }

  return (
    <div data-view-heading>
      <StartScreen
        investigation={investigation}
        progress={progress}
        preferences={preferences}
        blocked={session.blocked}
        onStart={(settings) => {
          if (session.start(settings)) show("study");
        }}
        onRestart={() => {
          if (!session.dispatch({ type: "restart" })) return;
          setDiscovery(null);
          show("study");
        }}
        onReview={() => void review()}
      />
    </div>
  );
}
