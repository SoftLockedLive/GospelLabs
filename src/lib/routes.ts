import type { SectionId } from "@/domain/investigation";

/** A new draft; with a question id it is seeded from the question bank. */
export function newInvestigationHref(questionId?: string): string {
  return questionId ? `/investigations/new?question=${encodeURIComponent(questionId)}` : "/investigations/new";
}

/**
 * A saved investigation, optionally opened at a specific section. The id is a
 * query parameter so that one static page serves every investigation, which
 * lets the app open any investigation offline.
 */
export function investigationHref(id: string, section?: SectionId): string {
  const params = new URLSearchParams({ id });
  if (section) params.set("section", section);
  return `/investigations/view?${params}`;
}

// --- Gospel Labs 2.0 ---------------------------------------------------------

/** The guided investigation library. */
export const investigateHref = () => "/investigate";

/** A guided investigation (one static page per investigation; progress loads in the browser). */
export const studyInvestigationHref = (id: string) => `/investigate/${encodeURIComponent(id)}`;

/** An investigation in progress, opened straight at the learner's step instead of its overview. */
export const resumeInvestigationHref = (id: string) => `${studyInvestigationHref(id)}?resume`;

export const explorerHref = (passageId?: string) => (passageId ? `/explore/${encodeURIComponent(passageId)}` : "/explore");

export const characterHref = (attributeId?: string) => (attributeId ? `/character/${encodeURIComponent(attributeId)}` : "/character");

/** Connect with Christ, optionally opened at one session. */
export const connectHref = (sessionId?: string) => (sessionId ? `/connect?session=${encodeURIComponent(sessionId)}` : "/connect");

/** The Discovery Notebook, optionally opened at one card (cards are personal data, so the id is a query parameter). */
export function notebookHref(cardId?: string): string {
  return cardId ? `/notebook?card=${encodeURIComponent(cardId)}` : "/notebook";
}

/** The Discovery Map, optionally focused on one node ("kind:id"). */
export function mapHref(nodeRef?: string): string {
  return nodeRef ? `/map?node=${encodeURIComponent(nodeRef)}` : "/map";
}
