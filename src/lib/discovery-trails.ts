import rawTrails from "@/data/discovery-trails.json";
import { parseDiscoveryTrails, type DiscoveryTrail } from "@/domain/discovery-trails";
import { QUESTION_BANK } from "./question-bank";

/**
 * The validated discovery trails. Validation runs when this module is first
 * loaded (at build time for static pages), so an invalid trail, or one whose
 * question isn't in the question bank, fails the build with a precise report.
 */
function loadDiscoveryTrails(): readonly DiscoveryTrail[] {
  const { trails, issues } = parseDiscoveryTrails(rawTrails, {
    questionIds: new Set(QUESTION_BANK.map((question) => question.id)),
  });
  if (issues.length > 0) {
    throw new Error(
      `src/data/discovery-trails.json has ${issues.length} problem${issues.length === 1 ? "" : "s"}:\n${issues.map((issue) => `  • ${issue}`).join("\n")}`,
    );
  }
  return trails;
}

export const DISCOVERY_TRAILS: readonly DiscoveryTrail[] = loadDiscoveryTrails();

export function getTrail(id: string): DiscoveryTrail | undefined {
  return DISCOVERY_TRAILS.find((trail) => trail.id === id);
}

/** The trail for a curated question, if it has one. Most questions don't. */
export function getTrailForQuestion(questionId: string): DiscoveryTrail | undefined {
  return DISCOVERY_TRAILS.find((trail) => trail.questionId === questionId);
}
