import { describe, expect, it } from "vitest";
import { buildContentRegistry } from "@/domain/study/content-registry";
import { SAMPLE_CONTENT } from "@/domain/study/test-fixtures";
import { AI_ASSIST_AVAILABLE, getStudyAssistant } from "./index";

const { registry } = buildContentRegistry(SAMPLE_CONTENT);
const investigation = registry.investigations[0];
const activity = investigation.steps[0].activities.medium!;
const sources = Object.fromEntries(registry.sources);

describe("LocalAssistant", () => {
  const assistant = getStudyAssistant([{ term: "Succor", description: "To run to help." }]);

  it("is local, and no AI help is available", () => {
    expect(assistant.kind).toBe("local");
    expect(AI_ASSIST_AVAILABLE).toBe(false);
  });

  it("explains curated terms, ignoring case and quotes", async () => {
    expect(await assistant.explainTerm("‘succor’")).toEqual({ provenance: "suggested", text: "To run to help.", sourceIds: [] });
    expect(await assistant.explainTerm("unknown")).toBeNull();
  });

  it("gives the next unused hint, then points to the evidence", async () => {
    expect(await assistant.moreHelp(activity, { attempts: 1, hintsShown: 1 }, { sources })).toMatchObject({ hintIndex: 1, provenance: "suggested" });
    const pointer = await assistant.moreHelp(activity, { attempts: 3, hintsShown: 2 }, { sources });
    expect(pointer.hintIndex).toBeUndefined();
    expect(pointer.text).toContain("Reread Alma 7:11–12");
    expect(pointer.sourceIds).toEqual(["alma-7-11-12"]);
  });

  it("suggests unexplored branch questions and open questions", async () => {
    expect((await assistant.followUpQuestions(investigation)).items).toEqual(["What does it mean that He calls us friends?"]);
    expect((await assistant.followUpQuestions(investigation, { visitedBranches: ["friends"] })).items).toEqual([]);
  });
});
