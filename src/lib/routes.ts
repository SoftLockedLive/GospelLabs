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
