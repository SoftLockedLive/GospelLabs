"use client";

/**
 * A guided investigation: Question → Evidence → Interactive Discovery →
 * Understanding → Saved Discovery. Three views share one session:
 *
 *   overview  the question, what it rests on, and how to study it (start/resume)
 *   study     the steps, with progress saved as the learner goes
 *   complete  the discovery, saved as a Discovery Card (re-completing updates it)
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

  if (progress === undefined) {
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
      setView("complete");
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
    setView("complete");
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
          onReviewSteps={() => setView("study")}
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
        onOverview={() => setView("overview")}
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
          if (session.start(settings)) setView("study");
        }}
        onRestart={() => {
          if (!session.dispatch({ type: "restart" })) return;
          setDiscovery(null);
          setView("study");
        }}
        onReview={() => void review()}
      />
    </div>
  );
}
