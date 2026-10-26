/**
 * The local study assistant: help drawn only from curated Gospel Labs content
 * (concept and vocabulary descriptions, an activity's own hints, branch
 * questions, and open questions). No model, no network, no keys. Everything
 * it returns is labeled "Suggested by Gospel Labs".
 */
import type { Activity, StudyInvestigation } from "@/domain/study/content-schema";
import { evidencePointer, hintsOf } from "@/domain/study/engine/hints";
import type { AssistActivityState, AssistContext, AssistResponse, FollowUpContext, StudyAssistant } from "./types";

export interface GlossaryEntry {
  term: string;
  description: string;
  sourceIds?: string[];
}

const normalize = (term: string) =>
  term
    .toLowerCase()
    .replace(/[‘’'“”"]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export class LocalAssistant implements StudyAssistant {
  readonly kind = "local" as const;
  private readonly glossary = new Map<string, GlossaryEntry>();

  /** `glossary`: curated concept and vocabulary descriptions, e.g. from the investigation bundle. */
  constructor(glossary: readonly GlossaryEntry[] = []) {
    for (const entry of glossary) this.glossary.set(normalize(entry.term), entry);
  }

  async explainTerm(term: string): Promise<AssistResponse | null> {
    const entry = this.glossary.get(normalize(term));
    if (!entry?.description) return null;
    return { provenance: "suggested", text: entry.description, sourceIds: entry.sourceIds ?? [] };
  }

  async moreHelp(activity: Activity, state: AssistActivityState, context: AssistContext = {}): Promise<AssistResponse> {
    const hints = hintsOf(activity);
    if (state.hintsShown < hints.length) {
      return { provenance: "suggested", text: hints[state.hintsShown], hintIndex: state.hintsShown };
    }
    const pointer = evidencePointer(activity, context.sources);
    return { provenance: "suggested", text: pointer.text, sourceIds: pointer.sourceIds };
  }

  async followUpQuestions(investigation: StudyInvestigation, context: FollowUpContext = {}): Promise<AssistResponse> {
    const visited = new Set(context.visitedBranches ?? []);
    const branches = investigation.branches.filter((branch) => !visited.has(branch.id)).map((branch) => branch.question);
    const items = [...new Set([...investigation.discovery.openQuestions, ...branches])];
    return {
      provenance: "suggested",
      text: items.length ? "Questions worth carrying forward:" : "Bring your own questions back to the scriptures and keep studying.",
      items,
    };
  }
}
