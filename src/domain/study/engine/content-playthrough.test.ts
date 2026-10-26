/**
 * Runs the engine over the real curated content: every activity's revealed
 * answer must check as correct (so "Show me" never contradicts "Check"),
 * and every investigation must play through at every difficulty and length
 * to a valid Discovery Card. Content files with their own validation issues
 * are reported by the content tests, not here.
 */
import { describe, expect, it } from "vitest";
import { ATTRIBUTE_FILES } from "@/content/attributes";
import rawConcepts from "@/content/concepts.json";
import rawConnect from "@/content/connect/sessions.json";
import { INVESTIGATION_FILES } from "@/content/investigations";
import { PASSAGE_FILES } from "@/content/passages";
import { check, emptyResponse, isCheckedActivity, isComplete, parseResponse, revealResponse } from "../activities";
import { buildInvestigationCard } from "../cards/investigation";
import { buildContentRegistry, stepActivities } from "../content-registry";
import type { Activity } from "../content-schema";
import { discoveryCardSchema, studyProgressSchema, type StudyProgress } from "../user-data";
import { DIFFICULTIES, STUDY_LENGTHS } from "../vocabulary";
import { bundleInvestigation, labelsLookup } from "./bundle";
import { mainPath, stepsAround } from "./path";
import { startProgress, studyReducer, type StudyAction, type StudyCommand } from "./progress";
import { completionState } from "./status";

const { registry } = buildContentRegistry({
  concepts: rawConcepts,
  investigations: INVESTIGATION_FILES,
  attributes: ATTRIBUTE_FILES,
  passages: PASSAGE_FILES,
  connect: rawConnect,
});

const allActivities: { where: string; activity: Activity }[] = [
  ...registry.investigations.flatMap((investigation) =>
    [...investigation.steps, ...investigation.branches.flatMap((branch) => branch.steps)].flatMap((step) =>
      stepActivities(step).map((activity) => ({ where: `${investigation.id}/${step.id}`, activity })),
    ),
  ),
  ...registry.attributes.flatMap((attribute) => attribute.activities.map((activity) => ({ where: `attribute ${attribute.id}`, activity }))),
  ...registry.passages.flatMap((passage) => passage.activities.map((activity) => ({ where: `passage ${passage.id}`, activity }))),
];

describe("curated activities", () => {
  it.each(allActivities.filter(({ activity }) => isCheckedActivity(activity)).map(({ where, activity }) => [`${where} ${activity.id}`, activity] as const))(
    "%s: the revealed answer checks as correct and an empty one can't be checked",
    (_name, activity) => {
      const revealed = JSON.parse(JSON.stringify(revealResponse(activity)));
      expect(parseResponse(activity, revealed)).toEqual(revealResponse(activity));
      expect(isComplete(activity, revealed)).toBe(true);
      expect(check(activity, revealed)).toMatchObject({ correct: true, feedback: [] });
      expect(isComplete(activity, emptyResponse(activity))).toBe(false);
    },
  );

  it("has activities to check (once content is written)", () => {
    expect(Array.isArray(allActivities)).toBe(true);
  });
});

const now = (n: number) => new Date(Date.UTC(2026, 9, 26, 10, 0, n)).toISOString();

function play(investigation: (typeof registry.investigations)[number], progress: StudyProgress, commands: StudyCommand[]): StudyProgress {
  return commands.reduce((state, command, i) => studyReducer(investigation, state, { ...command, now: now(i) } as StudyAction), progress);
}

describe.each(registry.investigations.map((investigation) => [investigation.id, investigation] as const))("investigation %s", (_id, investigation) => {
  const bundle = bundleInvestigation(registry, investigation);

  it("labels every Map node its connections and concepts use", () => {
    const steps = [...investigation.steps, ...investigation.branches.flatMap((branch) => branch.steps)];
    for (const step of steps) {
      for (const connection of step.connections) {
        expect(bundle.labels[connection.from], connection.from).toBeTruthy();
        expect(bundle.labels[connection.to], connection.to).toBeTruthy();
      }
      for (const id of step.concepts) expect(bundle.concepts[id]?.label, id).toBeTruthy();
    }
  });

  it.each(DIFFICULTIES.flatMap((difficulty) => STUDY_LENGTHS.map((length) => [difficulty, length] as const)))(
    "plays through at %s (%s) to a valid Discovery Card",
    (difficulty, length) => {
      let progress = startProgress(investigation, { difficulty, length, now: now(0) });
      const path = mainPath(investigation, length);
      path.forEach((step, index) => {
        // Alternate: work some out, reveal some, so both provenances are exercised.
        const outcome: StudyCommand = index % 3 === 1 ? { type: "reveal", step: { stepId: step.id } } : { type: "complete", step: { stepId: step.id }, outcome: { attempts: 1 } };
        progress = play(investigation, progress, [outcome]);
        if (length === "deep" && step.branchIds.length) {
          const branchId = step.branchIds[0];
          progress = play(investigation, progress, [{ type: "enterBranch", branchId }]);
          for (const branchStep of stepsAround(investigation, progress, branchId)) {
            progress = play(investigation, progress, [{ type: "complete", step: { stepId: branchStep.id, branchId } }, { type: "next" }]);
          }
          expect(progress.position.branchId).toBeUndefined();
          expect(progress.visitedBranches).toContain(branchId);
        }
        if (index < path.length - 1) progress = play(investigation, progress, [{ type: "next" }]);
      });
      expect(completionState(investigation, progress).complete).toBe(true);
      progress = play(investigation, progress, [{ type: "finish" }]);
      expect(progress.completedAt).toBeDefined();
      expect(studyProgressSchema.parse(JSON.parse(JSON.stringify(progress)))).toEqual(progress);

      const card = buildInvestigationCard({
        investigation,
        progress,
        sources: bundle.sources,
        labelFor: labelsLookup(bundle.labels),
        conceptRef: (id) => bundle.concepts[id].ref,
        id: "card",
        now: now(99),
      });
      expect(discoveryCardSchema.parse(card)).toEqual(card);
      for (const connection of card.connections) {
        for (const id of connection.sourceIds) expect(card.sources.some((source) => source.id === id), `${connection.id} cites ${id}`).toBe(true);
      }
    },
  );
});
