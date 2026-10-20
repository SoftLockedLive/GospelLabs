import type { Investigation, InvestigationStatus } from "./investigation";
import { normalizeSearchText } from "./question-filters";

export interface LibraryFilters {
  query: string;
  status: InvestigationStatus | null;
}

export const EMPTY_LIBRARY_FILTERS: LibraryFilters = { query: "", status: null };

function searchableText(investigation: Investigation): string {
  return normalizeSearchText(
    [
      investigation.title,
      investigation.question,
      investigation.category,
      ...investigation.evidence.flatMap((card) => [card.sourceTitle, ...card.tags]),
    ].join(" "),
  );
}

/** Every search term must appear in the title, question, category, or an evidence card's source or tags. */
export function filterInvestigations(investigations: readonly Investigation[], filters: LibraryFilters): Investigation[] {
  const terms = normalizeSearchText(filters.query).split(" ").filter(Boolean);
  return investigations.filter((investigation) => {
    if (filters.status !== null && investigation.status !== filters.status) return false;
    if (terms.length === 0) return true;
    const haystack = searchableText(investigation);
    return terms.every((term) => haystack.includes(term));
  });
}
