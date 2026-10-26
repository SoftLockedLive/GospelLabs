"use client";

/**
 * Adds what the learner studied here to their Discovery Notebook (one card
 * per attribute, updated in place) and from there to the Discovery Map.
 */
import { BookmarkPlus, Check, NotebookPen, Waypoints } from "lucide-react";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { explorationSummary } from "@/domain/study/character";
import { formatDate } from "@/lib/format";
import { mapHref, notebookHref } from "@/lib/routes";
import { useAttributeStudy } from "./attribute-study-context";

export function SaveToNotebook() {
  const { attribute, card, saveCard, saveError } = useAttributeStudy();
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  async function handleSave() {
    setState("saving");
    const saved = await saveCard();
    setState(saved ? "saved" : "idle");
  }

  return (
    <section aria-labelledby="keep-title" className="rounded-2xl border border-line bg-surface p-5 shadow-soft sm:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h2 id="keep-title" className="text-lg font-semibold tracking-tight text-fg">
            Keep what you’ve studied
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Your Notebook card for {attribute.name.toLowerCase()} gathers its definition, the words you opened, and the connections and sources on this
            page. It also places {attribute.name.toLowerCase()} on your Discovery Map. Finishing an activity updates the card for you.
          </p>
          {card && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-subtle">
              <Check aria-hidden className="size-3.5 text-green" />
              In your Notebook · updated {formatDate(card.updatedAt)}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
          <Button onClick={() => void handleSave()} disabled={state === "saving"} className="w-full sm:w-auto">
            <BookmarkPlus aria-hidden />
            {card ? "Update my Notebook card" : "Save to my Notebook"}
          </Button>
          {card && (
            <>
              <ButtonLink href={notebookHref(card.id)} variant="secondary" className="w-full sm:w-auto">
                <NotebookPen aria-hidden />
                Open in Notebook
              </ButtonLink>
              <ButtonLink href={mapHref(`attribute:${attribute.id}`)} variant="secondary" className="w-full sm:w-auto">
                <Waypoints aria-hidden />
                See it on the Map
              </ButtonLink>
            </>
          )}
        </div>
      </div>
      <p role="status" className="mt-3 min-h-5 text-sm">
        {state === "saved" && !saveError && <span className="motion-success inline-block font-medium text-green">Saved to your Notebook.</span>}
        {saveError && <span className="font-medium text-danger">{saveError}</span>}
      </p>
    </section>
  );
}

/** "Explored · 3 words" under the page title, once the record has loaded. */
export function ExploredStatus() {
  const { exploration } = useAttributeStudy();
  if (exploration.status !== "ready" || !exploration.value) return null;
  const summary = explorationSummary(exploration.value);
  if (!summary) return null;
  return (
    <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
      <Check aria-hidden className="size-3.5 text-green" />
      {summary}
    </p>
  );
}
