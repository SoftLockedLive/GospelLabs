/**
 * Shared by the attribute sections (server components) and PhoneCollapse (a
 * client component), so it lives outside both: a "use client" module can't
 * hand a plain string to a server component.
 */

/**
 * Put on each item of a list wrapped in PhoneCollapse: on phones it waits
 * behind the section's "Show …" button; on wider screens it always shows.
 * Items without it (safety notes) are never hidden.
 */
export const COLLAPSES_ON_PHONES = "max-sm:group-data-[collapsed]/phone:hidden";

/** The Church's abuse-help sources: anything citing one is a safety note. */
const ABUSE_HELP_SOURCES = new Set(["gospel-topics-abuse", "church-abuse-help"]);
const SAFETY_WORDING = /\babus|\bmistreat|hurting you|harm[’']s way/i;

/**
 * Whether an item tells a learner that an attribute never asks them to put up
 * with abuse or harm. Such items always stay visible: they are never collapsed.
 */
export function isSafetyNote(text: string, sourceIds: readonly string[] = []): boolean {
  return sourceIds.some((id) => ABUSE_HELP_SOURCES.has(id)) || SAFETY_WORDING.test(text);
}
