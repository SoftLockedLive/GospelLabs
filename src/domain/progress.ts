import type { Investigation, SectionId } from "./investigation";

const hasText = (value: string) => value.trim().length > 0;

/**
 * Whether the user has written anything in a section. Used only as a visual
 * hint in navigation; it never blocks moving between sections.
 */
export function sectionHasContent(investigation: Investigation, section: SectionId): boolean {
  const hasClaims = (claimSection: "analysis" | "conclusion") =>
    investigation.claims.some(
      (claim) => claim.section === claimSection && (hasText(claim.statement) || claim.evidenceIds.length > 0),
    );

  switch (section) {
    case "question":
      return (
        hasText(investigation.question) ||
        hasText(investigation.context) ||
        investigation.subquestions.some((s) => hasText(s.text))
      );
    case "hypothesis":
      return investigation.hypotheses.some((h) => hasText(h.statement));
    case "research":
      return investigation.evidence.length > 0;
    case "analysis":
      return hasText(investigation.analysisNotes) || hasClaims("analysis");
    case "conclusion":
      return (
        hasText(investigation.conclusion) ||
        hasClaims("conclusion") ||
        hasText(investigation.remainingQuestions) ||
        hasText(investigation.reflectionNotes)
      );
  }
}
