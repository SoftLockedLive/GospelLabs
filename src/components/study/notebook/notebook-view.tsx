"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { EMPTY_NOTEBOOK_FILTERS, type NotebookFilters } from "@/domain/study/notebook";
import { journalHref, mapHref, notebookHref } from "@/lib/routes";
import { JournalView } from "../journal/journal-view";
import type { JournalPlacesData } from "../journal/journal-places";
import { CardDetail } from "./card-detail";
import { NotebookBrowser } from "./notebook-browser";

type NotebookTab = "discoveries" | "journal";

/**
 * The Notebook (/notebook): Discovery Cards, and the Journal (/notebook?view=journal), where the learner writes
 * and finds everything they've written. One card opens over it (/notebook?card=id). The list stays mounted while
 * a card is open, so search and filters are kept when the learner comes back, and focus returns to the card
 * they opened.
 */
export function NotebookView({ places }: { places: JournalPlacesData }) {
  const router = useRouter();
  const params = useSearchParams();
  const cardId = params.get("card");
  const tab: NotebookTab = params.get("view") === "journal" ? "journal" : "discoveries";
  const [filters, setFilters] = useState<NotebookFilters>(EMPTY_NOTEBOOK_FILTERS);
  const [announcement, setAnnouncement] = useState("");
  const [lastOpened, setLastOpened] = useState<string | null>(null);

  // Remember the open card, so focus can return to it in the list.
  if (cardId && cardId !== lastOpened) setLastOpened(cardId);

  return (
    <>
      {cardId && (
        <CardDetail
          key={cardId}
          cardId={cardId}
          onDeleted={(card) => {
            setAnnouncement(`Deleted “${card.title}”`);
            setLastOpened(null);
            router.replace(notebookHref());
          }}
        />
      )}
      <div hidden={Boolean(cardId)} className="flex flex-col gap-6">
        <PageHeader
          title="Notebook"
          actions={
            <ButtonLink href={mapHref()} variant="secondary">
              Open your Map
            </ButtonLink>
          }
        />
        <Tabs<NotebookTab>
          label="Notebook"
          value={tab}
          onChange={(next) => router.replace(next === "journal" ? journalHref() : notebookHref(), { scroll: false })}
          items={[
            {
              value: "discoveries",
              label: "Discoveries",
              panel: (
                <NotebookBrowser
                  filters={filters}
                  onFiltersChange={setFilters}
                  returnFocusTo={cardId ? null : lastOpened}
                  announcement={announcement}
                />
              ),
            },
            { value: "journal", label: "Journal", panel: <JournalView places={places} /> },
          ]}
        />
      </div>
    </>
  );
}
