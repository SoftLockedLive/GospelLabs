"use client";

import { FileSearch, Plus } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RESEARCH_ACTIVITIES, type EvidenceInput, type ResearchActivity } from "@/domain/investigation";
import { connectionsFor, countCitations, findTrailProgress } from "@/domain/investigation-reducer";
import { getTrailForQuestion } from "@/lib/discovery-trails";
import { ChallengePanel } from "../challenges/challenge-panel";
import { EvidenceConnections, type ConnectionFormRequest } from "../connections/evidence-connections";
import { evidenceLabels } from "../evidence/evidence-label";
import { EvidenceCardView } from "../evidence/evidence-card-view";
import { EvidenceForm } from "../evidence/evidence-form";
import { focusEvidenceCard } from "../evidence/focus-evidence";
import type { SectionProps } from "../types";
import { TrailNotesArchive } from "../trails/trail-notes-archive";
import { TrailPanel } from "../trails/trail-panel";
import { activityPanelId, activityTabId, ResearchActivityTabs, type ActivityTab } from "./research-activity-tabs";
import { SuggestedReferences } from "./suggested-references";

type Editor = { mode: "new"; initial?: Partial<EvidenceInput> } | { mode: "edit"; id: string } | null;

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * Research, organized as activities: Discover (a curated question's trail),
 * Challenges, Evidence, and Connections. Every activity stays mounted while
 * hidden, so switching never loses input; the last one shown is remembered
 * with the investigation, like the current section.
 */
export function ResearchSection({ investigation, actions, sourceQuestion, onNavigate }: SectionProps) {
  const [editor, setEditor] = useState<Editor>(null);
  const [connectionForm, setConnectionForm] = useState<ConnectionFormRequest | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const { evidence, evidenceConnections, challengeResponses } = investigation;
  const labels = evidenceLabels(evidence);
  const citations = countCitations(investigation);
  const trail = sourceQuestion ? getTrailForQuestion(sourceQuestion.id) : undefined;
  // References the trail already offers aren't listed a second time.
  const trailReferences = trail?.steps.flatMap((step) => step.references) ?? [];
  const otherReferences = (sourceQuestion?.suggestedReferences ?? []).filter(
    (reference) =>
      !trailReferences.some((item) => (reference.url && item.url === reference.url) || item.label === reference.label),
  );
  // Notes from a trail this investigation no longer shows (e.g. the trail was removed from the app).
  const archivedTrailNotes = investigation.trailProgress
    .filter((progress) => progress.trailId !== trail?.id)
    .flatMap((progress) => progress.steps)
    .filter((step) => step.discoveries.trim());

  const hasDiscover = Boolean(trail) || archivedTrailNotes.length > 0;
  const available = RESEARCH_ACTIVITIES.filter((activity) => activity !== "discover" || hasDiscover);
  const remembered = investigation.researchActivity as ResearchActivity | undefined;
  const active: ResearchActivity =
    remembered && available.includes(remembered) ? remembered : trail ? "discover" : "evidence";

  const explored = trail ? (findTrailProgress(investigation, trail.id)?.steps.filter((s) => s.explored).length ?? 0) : 0;
  const tabs: ActivityTab[] = available.map((id): ActivityTab => {
    switch (id) {
      case "discover":
        return trail
          ? { id, count: `${explored}/${trail.steps.length}`, countLabel: `${explored} of ${trail.steps.length} steps explored` }
          : { id };
      case "challenges":
        return challengeResponses.length > 0
          ? { id, count: String(challengeResponses.length), countLabel: plural(challengeResponses.length, "response", "responses") }
          : { id };
      case "evidence":
        return { id, count: String(evidence.length), countLabel: plural(evidence.length, "card", "cards") };
      case "connections":
        return { id, count: String(evidenceConnections.length), countLabel: plural(evidenceConnections.length, "connection", "connections") };
    }
  });

  /** Shows an activity now, so focus can move into it right away. */
  const show = (activity: ResearchActivity) => flushSync(() => actions.setResearchActivity(activity));

  /** Closes the form, then moves focus somewhere that still exists. */
  const closeEditor = (focusEvidenceId?: string) => {
    flushSync(() => setEditor(null));
    const target = focusEvidenceId ? document.getElementById(`evidence-card-${focusEvidenceId}`) : addButtonRef.current;
    target?.focus();
  };

  // Each of these switches to the activity that does the work; the form focuses itself.
  const startNew = (initial?: Partial<EvidenceInput>) => {
    show("evidence");
    setEditor({ mode: "new", initial });
  };
  const startConnection = (fromEvidenceId?: string) => {
    show("connections");
    // A new key restarts the form when a request replaces one that's already open.
    setConnectionForm((current) => ({ key: (current?.key ?? 0) + 1, fromEvidenceId }));
  };
  const openEvidence = (evidenceId: string) => {
    show("evidence");
    focusEvidenceCard(evidenceId);
  };

  const panels: Record<ResearchActivity, ReactNode> = {
    discover: (
      <>
        {trail && (
          <TrailPanel
            trail={trail}
            investigation={investigation}
            actions={actions}
            onRecord={startNew}
            onNavigate={onNavigate}
          />
        )}
        <TrailNotesArchive heading="Notes from a discovery trail" notes={archivedTrailNotes} />
      </>
    ),
    challenges: <ChallengePanel investigation={investigation} actions={actions} />,
    evidence: (
      <>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-sm leading-relaxed text-muted">
            Record what each source says and why it matters to your question. Each card is your own observation.
          </p>
          <Button
            ref={addButtonRef}
            size="sm"
            className="self-start"
            disabled={editor?.mode === "new"}
            onClick={() => startNew()}
          >
            <Plus aria-hidden />
            Add evidence
          </Button>
        </div>

        {otherReferences.length > 0 && (
          <SuggestedReferences references={otherReferences} evidence={evidence} onRecord={startNew} />
        )}

        {editor?.mode === "new" && (
          <EvidenceForm
            key={editor.initial?.sourceTitle ?? "blank"}
            heading="New evidence"
            initial={editor.initial}
            submitLabel="Add evidence"
            onSubmit={(input) => closeEditor(actions.addEvidence(input))}
            onCancel={() => closeEditor()}
          />
        )}

        {evidence.length === 0 && editor?.mode !== "new" ? (
          <EmptyState
            icon={FileSearch}
            title="No evidence yet"
            description="Each evidence card holds a source, what you observed in it, and why it's relevant."
            action={
              <Button variant="secondary" onClick={() => startNew()}>
                <Plus aria-hidden />
                Add your first evidence
              </Button>
            }
          />
        ) : (
          <ul aria-label="Evidence" className="flex flex-col gap-3">
            {evidence.map((card) => (
              <li key={card.id}>
                {editor?.mode === "edit" && editor.id === card.id ? (
                  <EvidenceForm
                    heading={`Edit ${labels.get(card.id)}`}
                    initial={card}
                    submitLabel="Save changes"
                    onSubmit={(input) => {
                      actions.updateEvidence(card.id, input);
                      closeEditor(card.id);
                    }}
                    onCancel={() => closeEditor(card.id)}
                  />
                ) : (
                  <EvidenceCardView
                    card={card}
                    label={labels.get(card.id) ?? ""}
                    citationCount={citations.get(card.id) ?? 0}
                    connectionCount={connectionsFor(investigation, card.id).length}
                    onEdit={() => setEditor({ mode: "edit", id: card.id })}
                    onDelete={() => actions.removeEvidence(card.id)}
                    onConnect={evidence.length >= 2 ? () => startConnection(card.id) : undefined}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </>
    ),
    connections: (
      <EvidenceConnections
        investigation={investigation}
        actions={actions}
        labels={labels}
        form={connectionForm}
        onOpenForm={startConnection}
        onCloseForm={() => setConnectionForm(null)}
        onOpenEvidence={openEvidence}
      />
    ),
  };

  return (
    <div className="flex flex-col gap-6">
      <ResearchActivityTabs tabs={tabs} active={active} onSelect={(activity) => actions.setResearchActivity(activity)} />
      {available.map((activity) => (
        <div
          key={activity}
          id={activityPanelId(activity)}
          role="tabpanel"
          aria-labelledby={activityTabId(activity)}
          hidden={activity !== active}
          className="flex flex-col gap-6"
        >
          {panels[activity]}
        </div>
      ))}
    </div>
  );
}
