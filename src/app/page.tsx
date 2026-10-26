import { PageContainer } from "@/components/layout/app-shell";
import { WelcomeCard } from "@/components/release/welcome-card";
import { StudyDashboard } from "@/components/study/dashboard/study-dashboard";
import type { DashboardContent, InvestigationSummary } from "@/components/study/dashboard/types";
import type { StudyInvestigation } from "@/domain/study/content-schema";
import { parseNodeRef, type NodeRef } from "@/domain/study/vocabulary";
import { getSource, listAttributes, listConnectSessions, listInvestigations, listPassages, STUDY_CONTENT } from "@/lib/study-content";

const RELATED_KINDS = new Set(["concept", "vocabulary", "attribute"]);

/** Concept, vocabulary, and attribute nodes an investigation works with, for "related to your discoveries". */
function relatedNodes(investigation: StudyInvestigation): NodeRef[] {
  const refs = new Set<NodeRef>();
  const localConcepts = new Map(investigation.concepts.map((concept) => [concept.id, concept.kind]));
  const steps = [...investigation.steps, ...investigation.branches.flatMap((branch) => branch.steps)];
  for (const step of steps) {
    for (const id of step.concepts) {
      const kind = localConcepts.get(id) ?? STUDY_CONTENT.concepts.get(id)?.kind ?? "concept";
      refs.add(`${kind}:${id}`);
    }
    for (const connection of step.connections) {
      for (const ref of [connection.from, connection.to]) {
        const parsed = parseNodeRef(ref);
        if (parsed && RELATED_KINDS.has(parsed.kind)) refs.add(ref);
      }
    }
  }
  return [...refs];
}

function summarize(investigation: StudyInvestigation): InvestigationSummary {
  return {
    id: investigation.id,
    title: investigation.title,
    question: investigation.question,
    hook: investigation.hook,
    theme: investigation.theme,
    primaryQuestion: investigation.primaryQuestion.id,
    estimatedMinutes: investigation.estimatedMinutes,
    steps: investigation.steps.map((step) => ({ id: step.id, deep: step.depth === "deep" })),
    branches: investigation.branches.length,
    related: relatedNodes(investigation),
  };
}

/** Only what the dashboard shows, so the full content stays out of the browser bundle. */
function dashboardContent(): DashboardContent {
  return {
    investigations: listInvestigations().map(summarize),
    attributes: listAttributes().map(({ id, name, summary }) => ({ id, name, summary })),
    passages: listPassages().map(({ id, title, sourceId }) => ({ id, title, reference: getSource(sourceId)?.label ?? "" })),
    connectSessions: listConnectSessions().map(({ id, format, title }) => ({ id, format, title })),
  };
}

export default function HomePage() {
  return (
    <PageContainer className="flex flex-col gap-8">
      <WelcomeCard />
      <StudyDashboard content={dashboardContent()} />
    </PageContainer>
  );
}
