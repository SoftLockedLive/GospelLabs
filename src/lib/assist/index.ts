/**
 * Optional study help. Only the local, curated assistant exists: there is no
 * AI provider, API key, or network call anywhere in Gospel Labs, and the CSP
 * blocks third-party requests anyway. See README.md in this folder.
 */
import { LocalAssistant, type GlossaryEntry } from "./local";
import type { StudyAssistant } from "./types";

export type * from "./types";
export { LocalAssistant, type GlossaryEntry } from "./local";

/** No AI help is available. A future server-side provider would change this, never a browser-side key. */
export const AI_ASSIST_AVAILABLE = false;

/** The assistant for a screen, given the curated glossary it can draw on. */
export function getStudyAssistant(glossary: readonly GlossaryEntry[] = []): StudyAssistant {
  return new LocalAssistant(glossary);
}

/** How help from an assistant is described to the learner. */
export const ASSIST_SOURCE_NOTE: Record<StudyAssistant["kind"], string> = {
  local: "From Gospel Labs’ curated study content",
  ai: "AI-generated—not doctrine or revelation",
};
