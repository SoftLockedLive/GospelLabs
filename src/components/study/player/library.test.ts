import { describe, expect, it } from "vitest";
import { buildContentRegistry } from "@/domain/study/content-registry";
import { startProgress, studyReducer, type StudyAction } from "@/domain/study/engine/progress";
import { SAMPLE_CONTENT } from "@/domain/study/test-fixtures";
import { libraryStatus, summarizeInvestigation } from "./library";

const NOW = "2026-10-26T10:00:00.000Z";
const { registry } = buildContentRegistry(SAMPLE_CONTENT);
const investigation = registry.investigations[0];
const summary = summarizeInvestigation(investigation, registry);

describe("investigation library", () => {
  it("summarizes what a card needs, with related Map nodes", () => {
    expect(summary).toMatchObject({
      id: "sample-investigation",
      theme: "Jesus Christ",
      primaryQuestion: "christ",
      estimatedMinutes: { quick: 6, deep: 20 },
      steps: [
        { id: "notice", deep: false },
        { id: "connect", deep: false },
        { id: "reflect", deep: false },
      ],
      branches: 1,
    });
    expect([...summary.related].sort()).toEqual(["concept:atonement", "vocabulary:succor"]);
    expect(JSON.parse(JSON.stringify(summary))).toEqual(summary);
  });

  it("reports not started, step n of m, and completed", () => {
    expect(libraryStatus(summary)).toEqual({ kind: "not-started" });
    const started = startProgress(investigation, { difficulty: "medium", length: "quick", now: NOW });
    expect(libraryStatus(summary, started)).toEqual({ kind: "in-progress", step: 1, total: 3, inBranch: false });
    const moved = studyReducer(investigation, started, { type: "next", now: NOW } as StudyAction);
    expect(libraryStatus(summary, moved)).toMatchObject({ step: 2, total: 3 });
    const branched = studyReducer(investigation, { ...started, length: "deep" }, { type: "enterBranch", branchId: "friends", now: NOW } as StudyAction);
    expect(libraryStatus(summary, branched)).toEqual({ kind: "in-progress", step: 1, total: 3, inBranch: true });
    expect(libraryStatus(summary, { ...moved, completedAt: NOW })).toEqual({ kind: "completed", completedAt: NOW });
  });
});
