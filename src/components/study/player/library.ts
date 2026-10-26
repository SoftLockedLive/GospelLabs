/**
 * The guided-investigation library: what each investigation card shows
 * (the shared InvestigationSummary from domain/study/suggestions, built on
 * the server) and the learner's status in it. Status describes what was
 * studied, never how well.
 */
import type { StudyContentRegistry } from "@/domain/study/content-registry";
import type { StudyInvestigation } from "@/domain/study/content-schema";
import { conceptRef } from "@/domain/study/engine/bundle";
import { studyPosition, type InvestigationSummary } from "@/domain/study/suggestions";
import type { StudyProgress } from "@/domain/study/user-data";
import { parseNodeRef, type NodeRef } from "@/domain/study/vocabulary";

export type { InvestigationSummary };

const RELATED_KINDS = new Set(["concept", "vocabulary", "attribute"]);

/** The summary of an investigation, as the dashboard and the library show it. */
export function summarizeInvestigation(
  investigation: StudyInvestigation,
  registry: Pick<StudyContentRegistry, "concepts" | "attributeVocabulary">,
): InvestigationSummary {
  const related = new Set<NodeRef>();
  const inline = new Map(investigation.concepts.map((concept) => [concept.id, concept.kind]));
  for (const step of [...investigation.steps, ...investigation.branches.flatMap((branch) => branch.steps)]) {
    for (const id of step.concepts) related.add(inline.has(id) ? `${inline.get(id)!}:${id}` : conceptRef(registry, id));
    for (const connection of step.connections) {
      for (const ref of [connection.from, connection.to]) if (RELATED_KINDS.has(parseNodeRef(ref)?.kind ?? "")) related.add(ref);
    }
  }
  return {
    id: investigation.id,
    title: investigation.title,
    question: investigation.question,
    hook: investigation.hook,
    theme: investigation.theme,
    primaryQuestion: investigation.primaryQuestion.id,
    estimatedMinutes: { ...investigation.estimatedMinutes },
    steps: investigation.steps.map((step) => ({ id: step.id, deep: step.depth === "deep" })),
    branches: investigation.branches.length,
    related: [...related],
  };
}

export type LibraryStatus =
  | { kind: "not-started" }
  | { kind: "in-progress"; step: number; total: number; inBranch: boolean }
  | { kind: "completed"; completedAt: string };

export function libraryStatus(summary: InvestigationSummary, progress?: StudyProgress): LibraryStatus {
  if (!progress) return { kind: "not-started" };
  if (progress.completedAt) return { kind: "completed", completedAt: progress.completedAt };
  const { step, total, inBranch } = studyPosition(progress, summary);
  return { kind: "in-progress", step: Math.max(step, 1), total, inBranch };
}
