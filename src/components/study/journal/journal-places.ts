/**
 * Titles of study content for the Journal, passed from a server page (see
 * journal-places-data.ts) so the full content stays out of the browser
 * bundle: each investigation, passage, attribute, and Connect with Christ
 * session's title, and each step's title.
 */
import type { JournalPlaces } from "@/domain/study/journal";
import type { DiscoveryOrigin } from "@/domain/study/user-data";
import { stepKey } from "@/domain/study/user-data";

export interface JournalPlacesData {
  titles: Record<DiscoveryOrigin, Record<string, string>>;
  /** Investigation id → step key ("stepId", or "branchId/stepId") → the step's title. */
  steps: Record<string, Record<string, string>>;
}

/** The lookups compileJournal and placeLabel need. */
export function toJournalPlaces(data: JournalPlacesData): JournalPlaces {
  return {
    title: (kind, contentId) => data.titles[kind]?.[contentId],
    step: (investigationId, stepId, branchId) => data.steps[investigationId]?.[stepKey(stepId, branchId)],
  };
}
