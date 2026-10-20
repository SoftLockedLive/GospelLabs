import rawChallenges from "@/data/research-challenges.json";
import { parseResearchChallenges, type ResearchChallenge } from "@/domain/research-challenges";

/**
 * The validated research challenges. Validation runs when this module is
 * first loaded (at build time for static pages), so an invalid entry fails
 * the build with a precise report instead of shipping broken data.
 */
function loadResearchChallenges(): readonly ResearchChallenge[] {
  const { challenges, issues } = parseResearchChallenges(rawChallenges);
  if (issues.length > 0) {
    throw new Error(
      `src/data/research-challenges.json has ${issues.length} problem${issues.length === 1 ? "" : "s"}:\n${issues.map((issue) => `  • ${issue}`).join("\n")}`,
    );
  }
  return challenges;
}

export const RESEARCH_CHALLENGES: readonly ResearchChallenge[] = loadResearchChallenges();

export function getResearchChallenge(id: string): ResearchChallenge | undefined {
  return RESEARCH_CHALLENGES.find((challenge) => challenge.id === id);
}
