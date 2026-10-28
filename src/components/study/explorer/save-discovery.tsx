"use client";

/**
 * "Save to Notebook": creates the passage's Discovery Card, or updates
 * it if one was saved before (keeping the learner's Notebook notes). Nothing
 * is saved until the learner asks.
 */
import { BookmarkPlus, Check, Map as MapIcon, NotebookPen, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProvenanceLabel } from "@/components/study/shared/provenance";
import { buildPassageCard, findPassageCard } from "@/domain/study/cards/passage";
import { labelsLookup } from "@/domain/study/engine/bundle";
import type { PassageBundle } from "@/domain/study/explorer";
import type { Exploration } from "@/domain/study/user-data";
import { nodeRef } from "@/domain/study/vocabulary";
import { formatDate } from "@/lib/format";
import { createId } from "@/lib/ids";
import { mapHref, notebookHref } from "@/lib/routes";
import { getStudyRepository } from "@/persistence/client";
import { useDiscoveryCards } from "@/persistence/study-hooks";
import { toStorageError } from "@/persistence/storage-errors";

type SaveState = { kind: "idle" | "saving" } | { kind: "saved"; cardId: string } | { kind: "error"; message: string };

interface SaveDiscoveryProps {
  bundle: PassageBundle;
  exploration: Exploration | undefined;
  /**
   * False while the learner's exploration is loading or can't be read. Saving then would build the card
   * without their highlights and, for a card saved before, replace the highlights it holds.
   */
  explorationReady: boolean;
  /** Saves the exploration first, so the card and the exploration agree. */
  beforeSave: () => Promise<void>;
}

export function SaveDiscovery({ bundle, exploration, explorationReady, beforeSave }: SaveDiscoveryProps) {
  const { passage, sources, labels, themes } = bundle;
  const cards = useDiscoveryCards();
  const [state, setState] = useState<SaveState>({ kind: "idle" });
  const existing = cards.status === "ready" ? findPassageCard(cards.value.records, passage.id) : undefined;
  const labelFor = labelsLookup(labels);
  const themeRef = (id: string) => themes[id]?.ref ?? nodeRef("concept", id);

  // What the card would hold right now.
  const preview = buildPassageCard({ passage, sources, exploration, labelFor, themeRef, id: "preview", now: new Date(0).toISOString() });
  const discovered = preview.concepts.filter((concept) => concept.demonstrated).length;
  const connectionsFound = preview.connections.filter((connection) => connection.provenance === "demonstrated").length;
  const changedSinceSave = !!existing && !!exploration && Date.parse(exploration.updatedAt) > Date.parse(existing.updatedAt);
  const savedCardId = state.kind === "saved" ? state.cardId : existing?.id;

  async function save() {
    if (!explorationReady) return;
    setState({ kind: "saving" });
    try {
      await beforeSave();
      const card = buildPassageCard({
        passage,
        sources,
        exploration,
        labelFor,
        themeRef,
        id: createId(),
        now: new Date().toISOString(),
        existing,
      });
      const saved = await getStudyRepository().discoveries.put(card);
      setState({ kind: "saved", cardId: saved.id });
    } catch (error) {
      setState({ kind: "error", message: toStorageError(error).message });
    }
  }

  return (
    <section aria-labelledby="save-heading" className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
        <div className="max-w-xl">
          <h2 id="save-heading" className="flex items-center gap-2 text-base font-semibold tracking-tight text-fg">
            <NotebookPen aria-hidden className="size-4 text-accent" />
            Save to Notebook
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Keeps this passage as one Discovery Card: your highlights and notes, the themes you worked with, and the connections the
            passage supports. Saving again updates the same card, and anything you&rsquo;ve written on it in your Notebook stays.
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            <SaveStat value={preview.highlights.length} label={preview.highlights.length === 1 ? "highlight" : "highlights"} />
            <SaveStat
              value={discovered ? `${discovered} of ${preview.concepts.length}` : preview.concepts.length}
              label={discovered ? "themes you’ve worked with" : preview.concepts.length === 1 ? "theme in this passage" : "themes in this passage"}
            />
            <SaveStat
              value={connectionsFound ? `${connectionsFound} of ${preview.connections.length}` : preview.connections.length}
              label={
                connectionsFound ? "connections you’ve found" : preview.connections.length === 1 ? "connection in this passage" : "connections in this passage"
              }
            />
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-subtle">
            Themes and connections you haven&rsquo;t worked with are saved as{" "}
            <ProvenanceLabel provenance="suggested" className="align-middle" />. Tag highlights with themes, or complete activities, to
            mark them <ProvenanceLabel provenance="demonstrated" className="align-middle" />.
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:min-w-64 lg:items-end">
          <Button
            size="lg"
            className="h-auto! min-h-12 py-2.5"
            disabled={!explorationReady || cards.status === "loading" || state.kind === "saving"}
            onClick={() => void save()}
          >
            {existing || state.kind === "saved" ? <RefreshCw aria-hidden /> : <BookmarkPlus aria-hidden />}
            <span className="whitespace-normal">{existing || state.kind === "saved" ? "Update Notebook card" : "Save to Notebook"}</span>
          </Button>
          {existing && state.kind !== "saved" && (
            <p className="text-xs text-subtle lg:text-right">
              Last saved {formatDate(existing.updatedAt)}
              {changedSinceSave && " · you’ve explored more since then"}
            </p>
          )}
          {savedCardId && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 lg:justify-end">
              <Link href={notebookHref(savedCardId)} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-strong hover:underline">
                <NotebookPen aria-hidden className="size-3.5" />
                Open in Notebook
              </Link>
              <Link
                href={mapHref(nodeRef("scripture", passage.sourceId))}
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-strong hover:underline"
              >
                <MapIcon aria-hidden className="size-3.5" />
                See on Map
              </Link>
            </div>
          )}
        </div>
      </div>

      <p aria-live="polite" className="mt-3 text-sm">
        {state.kind === "saved" && (
          <span className="motion-success inline-flex items-center gap-1.5 text-green">
            <Check aria-hidden className="size-4" />
            Saved to your Notebook.
          </span>
        )}
        {state.kind === "error" && <span className="text-danger">This couldn&rsquo;t be saved. {state.message}</span>}
        {cards.status === "error" && <span className="text-danger">Your Notebook can&rsquo;t be opened right now. {cards.error.message}</span>}
      </p>
    </section>
  );
}

function SaveStat({ value, label }: { value: number | string; label: string }) {
  return (
    <li className="rounded-lg border border-line bg-surface-sunken px-3 py-2">
      <span className="block font-semibold tabular-nums text-base text-fg tabular-nums">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </li>
  );
}
