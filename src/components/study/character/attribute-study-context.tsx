"use client";

/**
 * Shared state for one attribute page: the learner's Exploration record and
 * their Discovery Card for this attribute. Every write goes through one
 * queue and starts from the stored record (see attribute-storage.ts), so
 * quick successive changes (opening a word while a note saves) never
 * overwrite each other, and a stored record that can't be read is reported,
 * never replaced.
 *
 *   - The Exploration is created on the first visit; later visits only
 *     record lastOpenedAt. updatedAt moves only when the learner's work does.
 *   - Opening a word records it; finishing an activity records it.
 *   - Finishing an activity also creates or updates the attribute's Discovery
 *     Card, as does "Save to my Notebook".
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ActivityResult } from "@/components/study/activities/types";
import { attributeDiscoveryCard, findAttributeCard, type AttributeActivityOutcome } from "@/domain/study/cards/attribute";
import { attributeExplorationId, withCompletedActivity, withNote, withVocabulary, type AttributeLink } from "@/domain/study/character";
import type { ChristAttribute, Source } from "@/domain/study/content-schema";
import type { DiscoveryCard, Exploration } from "@/domain/study/user-data";
import type { NodeRef } from "@/domain/study/vocabulary";
import { createId } from "@/lib/ids";
import { getStudyRepository } from "@/persistence/client";
import { useDiscoveryCards, useExploration, type LiveState } from "@/persistence/study-hooks";
import { toStorageError } from "@/persistence/storage-errors";
import { changeAttributeExploration, recordAttributeVisit } from "./attribute-storage";

export interface AttributeStudyData {
  attribute: ChristAttribute;
  /** Relationships touching this attribute, including those declared toward it. */
  links: AttributeLink[];
  /** Every source the page cites, keyed by id. */
  sources: Record<string, Source>;
  /** Labels for every Map node the card can name (computed on the server). */
  labels: Record<string, string>;
}

interface AttributeStudyValue extends AttributeStudyData {
  /** The stored Exploration, followed live. After a failed read, `exploration.retry()` reads it again. */
  exploration: LiveState<Exploration | undefined>;
  /** The learner's Discovery Card for this attribute, once loaded. */
  card: DiscoveryCard | undefined;
  openWord: (vocabularyId: string) => void;
  /** Records a finished activity and updates the Discovery Card. Resolves to the saved card, or undefined if saving failed. */
  completeActivity: (activityId: string, result: ActivityResult) => Promise<DiscoveryCard | undefined>;
  /** Saves the private note. Rejects (with a StorageError) if it couldn't be saved. */
  saveNote: (note: string) => Promise<void>;
  saveCard: () => Promise<DiscoveryCard | undefined>;
  /** The last storage problem, in words for the learner. */
  saveError: string | null;
}

const AttributeStudyContext = createContext<AttributeStudyValue | null>(null);

/** For writes whose failure is already shown through saveError. */
const quietly = <T,>(write: Promise<T>): Promise<T | undefined> => write.catch(() => undefined);

export function useAttributeStudy(): AttributeStudyValue {
  const value = useContext(AttributeStudyContext);
  if (!value) throw new Error("useAttributeStudy must be used inside <AttributeStudyProvider>");
  return value;
}

export function AttributeStudyProvider({ children, attribute, links, sources, labels }: AttributeStudyData & { children: ReactNode }) {
  const explorationKey = attributeExplorationId(attribute.id);
  const exploration = useExploration(explorationKey);
  const cards = useDiscoveryCards();
  const card = cards.status === "ready" ? findAttributeCard(cards.value.records, attribute.id) : undefined;
  const [saveError, setSaveError] = useState<string | null>(null);

  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const outcomes = useRef<Record<string, AttributeActivityOutcome>>({});

  /** Runs writes one after another; a failed write doesn't block the next. Rejects with the write's error. */
  const enqueue = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const run = queue.current.then(task);
    queue.current = run.then(
      () => setSaveError(null),
      (error: unknown) => setSaveError(`Couldn’t save on this device. ${toStorageError(error).message}`),
    );
    return run;
  }, []);

  const updateExploration = useCallback(
    (change: (exploration: Exploration) => Exploration) =>
      enqueue(() => changeAttributeExploration(getStudyRepository(), attribute.id, change, new Date())),
    [enqueue, attribute.id],
  );

  const writeCard = useCallback(
    () =>
      enqueue(async () => {
        const repository = getStudyRepository();
        // An exploration that can't be read stops the save (get throws) rather than building a card without
        // the learner's words and activities, which would replace them on a card saved before.
        const [stored, list] = await Promise.all([repository.explorations.get(explorationKey), repository.discoveries.list()]);
        const next = attributeDiscoveryCard({
          attribute,
          links,
          sources,
          labelFor: (ref: NodeRef) => labels[ref] ?? ref,
          exploration: stored,
          outcomes: outcomes.current,
          existing: findAttributeCard(list.records, attribute.id),
          id: createId(),
          now: new Date(),
        });
        return repository.discoveries.put(next);
      }),
    [enqueue, explorationKey, attribute, links, sources, labels],
  );

  // Record the visit once the stored record (or its absence) is known: after a failed read, only once a
  // later read succeeds.
  const loaded = exploration.status === "ready";
  const visited = useRef(false);
  useEffect(() => {
    if (!loaded || visited.current) return;
    visited.current = true;
    void quietly(enqueue(() => recordAttributeVisit(getStudyRepository(), attribute.id, new Date())));
  }, [loaded, enqueue, attribute.id]);

  const value = useMemo<AttributeStudyValue>(
    () => ({
      attribute,
      links,
      sources,
      labels,
      exploration,
      card,
      saveError,
      openWord: (vocabularyId) => {
        if (exploration.status === "ready" && exploration.value?.vocabulary.includes(vocabularyId)) return;
        void quietly(updateExploration((current) => withVocabulary(current, vocabularyId)));
      },
      completeActivity: async (activityId, result) => {
        const previous = outcomes.current[activityId];
        outcomes.current = { ...outcomes.current, [activityId]: { demonstrated: result.demonstrated || !!previous?.demonstrated } };
        await quietly(updateExploration((current) => withCompletedActivity(current, activityId)));
        return quietly(writeCard());
      },
      saveNote: async (note) => void (await updateExploration((current) => withNote(current, note))),
      saveCard: () => quietly(writeCard()),
    }),
    [attribute, links, sources, labels, exploration, card, saveError, updateExploration, writeCard],
  );

  return <AttributeStudyContext.Provider value={value}>{children}</AttributeStudyContext.Provider>;
}
