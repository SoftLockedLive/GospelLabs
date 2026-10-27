/**
 * Render smoke tests (node environment, no DOM): every curated activity and
 * the player's views must render without throwing, in their fresh, in-progress,
 * and finished states. Effects don't run in server rendering; interaction is
 * covered by the pure modules' tests and the end-to-end tests.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ATTRIBUTE_FILES } from "@/content/attributes";
import rawConcepts from "@/content/concepts.json";
import rawConnect from "@/content/connect/sessions.json";
import { INVESTIGATION_FILES } from "@/content/investigations";
import { PASSAGE_FILES } from "@/content/passages";
import { revealResponse } from "@/domain/study/activities";
import { buildInvestigationCard } from "@/domain/study/cards/investigation";
import { buildContentRegistry, stepActivities } from "@/domain/study/content-registry";
import type { Activity } from "@/domain/study/content-schema";
import { bundleInvestigation, labelsLookup } from "@/domain/study/engine/bundle";
import { mainPath } from "@/domain/study/engine/path";
import { startProgress, studyReducer, type StudyAction, type StudyCommand } from "@/domain/study/engine/progress";
import { SAMPLE_CONTENT } from "@/domain/study/test-fixtures";
import { getStudyAssistant } from "@/lib/assist";
import { DEFAULT_PREFERENCES } from "@/lib/preferences";
import { ActivityRenderer } from "../activities/activity-renderer";
import { CompletionView } from "./completion-view";
import { NEWER_CONTENT_MESSAGE } from "./progress-storage";
import { StartScreen } from "./start-screen";
import { StepView } from "./step-view";

const real = buildContentRegistry({
  concepts: rawConcepts,
  investigations: INVESTIGATION_FILES,
  attributes: ATTRIBUTE_FILES,
  passages: PASSAGE_FILES,
  connect: rawConnect,
}).registry;
const sample = buildContentRegistry(SAMPLE_CONTENT).registry;
const registries = [sample, real];

const sources = Object.fromEntries([...sample.sources, ...real.sources]);
const activities: [string, Activity][] = registries.flatMap((registry) => [
  ...registry.investigations.flatMap((investigation) =>
    [...investigation.steps, ...investigation.branches.flatMap((branch) => branch.steps)].flatMap((step) =>
      stepActivities(step).map((activity) => [`${investigation.id} ${activity.id}`, activity] as [string, Activity]),
    ),
  ),
  ...registry.attributes.flatMap((attribute) => attribute.activities.map((activity) => [`${attribute.id} ${activity.id}`, activity] as [string, Activity])),
  ...registry.passages.flatMap((passage) => passage.activities.map((activity) => [`${passage.id} ${activity.id}`, activity] as [string, Activity])),
]);

const render = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element);
const noop = () => {};
const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

describe("ActivityRenderer", () => {
  it.each(activities)("%s renders fresh, mid-attempt, and revealed", (_name, activity) => {
    const fresh = render(createElement(ActivityRenderer, { activity, sources, onComplete: noop, difficulty: "medium" }));
    expect(fresh).toContain(escape(activity.prompt));

    const stuck = render(
      createElement(ActivityRenderer, { activity, sources, onComplete: noop, allowSkip: true, initialState: { attempts: 3, hintsShown: 1 } }),
    );
    if (activity.type !== "reflect") {
      expect(stuck).toContain("Show me");
      expect(stuck).toContain("Continue anyway");
    }

    const revealed = render(
      createElement(ActivityRenderer, {
        activity,
        sources,
        onComplete: noop,
        initialState: { attempts: 3, revealed: activity.type !== "reflect", completed: true, response: revealResponse(activity), reflection: "Thoughts" },
      }),
    );
    if (activity.type !== "reflect") {
      expect(revealed).toContain("Here is the answer");
      expect(revealed).toContain("Suggested by Gospel Labs");
    }
  });
});

const investigations = registries.flatMap((registry) => registry.investigations.map((investigation) => ({ registry, investigation })));

describe.each(investigations.map(({ registry, investigation }) => [investigation.id, registry, investigation] as const))("player for %s", (_id, registry, investigation) => {
  const bundle = bundleInvestigation(registry, investigation);
  const assistant = getStudyAssistant();
  const NOW = "2026-10-26T10:00:00.000Z";
  const act = (progress: ReturnType<typeof startProgress>, action: StudyCommand) =>
    studyReducer(investigation, progress, { ...action, now: NOW } as StudyAction);

  it("renders the start screen, new and in progress", () => {
    const fresh = render(createElement(StartScreen, { investigation, progress: null, preferences: DEFAULT_PREFERENCES, onStart: noop, onRestart: noop, onReview: noop }));
    expect(fresh).toContain("Begin the investigation");
    const progress = startProgress(investigation, { difficulty: "hard", length: "deep", now: NOW });
    expect(render(createElement(StartScreen, { investigation, progress, preferences: DEFAULT_PREFERENCES, onStart: noop, onRestart: noop, onReview: noop }))).toContain(
      "Resume",
    );
  });

  it("offers nothing that writes over progress from a newer version: read-only, with a reload", () => {
    const props = { investigation, preferences: DEFAULT_PREFERENCES, onStart: noop, onRestart: noop, onReview: noop };
    const blocked = { reason: "newer-content" as const, message: NEWER_CONTENT_MESSAGE };
    const started = { ...startProgress(investigation, { difficulty: "hard", length: "deep", now: NOW }), contentVersion: investigation.contentVersion + 1 };
    for (const progress of [started, { ...started, completedAt: NOW }]) {
      const html = render(createElement(StartScreen, { ...props, progress, blocked }));
      expect(html).toContain(escape(NEWER_CONTENT_MESSAGE));
      expect(html).toContain(">Reload<");
      for (const action of ["Resume", "Begin the investigation", "Look through the steps", "Start over", "Study it again", "Review your discovery", "Study without saving"]) {
        expect(html).not.toContain(action);
      }
    }
    expect(render(createElement(StartScreen, { ...props, progress: { ...started, completedAt: NOW }, blocked }))).toContain("You completed this investigation on");
  });

  it("while saved progress can't be read, offers only to study without saving", () => {
    const message = "Some saved study data couldn't be read.";
    const html = render(
      createElement(StartScreen, { investigation, progress: null, preferences: DEFAULT_PREFERENCES, blocked: { reason: "unreadable", message }, onStart: noop, onRestart: noop, onReview: noop }),
    );
    expect(html).toContain("Your saved progress couldn’t be loaded.");
    expect(html).toContain(escape(message));
    expect(html).toContain("Study without saving");
    expect(html).not.toContain("Begin the investigation");
    expect(html).not.toContain("Start over");
  });

  it("renders every main-path step, open and completed", () => {
    let progress = startProgress(investigation, { difficulty: "complex", length: "deep", now: NOW });
    const stepProps = {
      bundle,
      preferences: DEFAULT_PREFERENCES,
      assistant,
      dispatch: () => null,
      onFinish: noop,
      finishing: false,
      suggestion: { direction: "up" as const, from: "complex" as const, difficulty: "complex" as const },
      onAcceptSuggestion: noop,
      onDismissSuggestion: noop,
      dismissedBranches: new Set<string>(),
      onDismissBranch: noop,
    };
    for (const [index, step] of mainPath(investigation, "deep").entries()) {
      if (index > 0) progress = act(progress, { type: "next" });
      const open = render(createElement(StepView, { ...stepProps, progress }));
      expect(open).toContain(escape(step.title));
      progress = act(progress, index % 2 ? { type: "reveal", step: { stepId: step.id } } : { type: "complete", step: { stepId: step.id } });
      const done = render(createElement(StepView, { ...stepProps, progress }));
      expect(done).toContain("What this step brings out");
    }
    for (const branch of investigation.branches) {
      const branched = act(progress, { type: "enterBranch", branchId: branch.id });
      expect(render(createElement(StepView, { ...stepProps, progress: branched }))).toContain(escape(branch.steps[0].title));
    }
    progress = act(progress, { type: "finish" });
    const card = buildInvestigationCard({
      investigation,
      progress,
      sources: bundle.sources,
      labelFor: labelsLookup(bundle.labels),
      conceptRef: (id) => bundle.concepts[id].ref,
      id: "card",
      now: NOW,
    });
    const completion = render(
      createElement(CompletionView, {
        investigation,
        progress,
        card,
        saved: true,
        saveError: null,
        onSaveCard: noop,
        noteStatus: { state: "idle" },
        onNoteChange: noop,
        onReviewSteps: noop,
        assistant,
      }),
    );
    expect(completion).toContain("Saved to your Notebook.");
    expect(completion).toContain(escape(investigation.discovery.christConnection));
  });
});
