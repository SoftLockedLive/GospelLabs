import type { Investigation, SectionId } from "@/domain/investigation";
import type { CuratedQuestion } from "@/domain/question-bank";
import type { InvestigationActions } from "./use-investigation";

export interface SectionProps {
  investigation: Investigation;
  actions: InvestigationActions;
  /** The curated question this investigation started from, if any. */
  sourceQuestion?: CuratedQuestion;
  /** Switches to another section (for cross-section links). */
  onNavigate: (section: SectionId) => void;
}
