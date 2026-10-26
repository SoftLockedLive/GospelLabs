"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { EMPTY_NOTEBOOK_FILTERS, type NotebookFilters } from "@/domain/study/notebook";
import { notebookHref } from "@/lib/routes";
import { CardDetail } from "./card-detail";
import { NotebookBrowser } from "./notebook-browser";

/**
 * The Discovery Notebook (/notebook), or one card (/notebook?card=id). The
 * list stays mounted while a card is open, so search and filters are kept
 * when the learner comes back, and focus returns to the card they opened.
 */
export function NotebookView() {
  const router = useRouter();
  const cardId = useSearchParams().get("card");
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
      <div hidden={Boolean(cardId)}>
        <NotebookBrowser
          filters={filters}
          onFiltersChange={setFilters}
          returnFocusTo={cardId ? null : lastOpened}
          announcement={announcement}
        />
      </div>
    </>
  );
}
