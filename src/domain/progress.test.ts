import { describe, expect, it } from "vitest";
import { investigationReducer } from "./investigation-reducer";
import { sectionHasContent } from "./progress";
import { blankInvestigation, challengeSnapshot, T1, TRAIL_ID, trailStepSnapshot } from "./test-fixtures";

describe("sectionHasContent", () => {
  it("marks Conclusion once a Come unto Christ prompt is answered", () => {
    const blank = blankInvestigation();
    expect(sectionHasContent(blank, "conclusion")).toBe(false);
    const answered = investigationReducer(blank, {
      type: "setReflection",
      promptId: "follow-him",
      value: "Pray more sincerely",
      now: T1,
    });
    expect(sectionHasContent(answered, "conclusion")).toBe(true);
  });

  it("marks Research once a challenge has a response, even without evidence", () => {
    const blank = blankInvestigation();
    expect(sectionHasContent(blank, "research")).toBe(false);
    const responded = investigationReducer(blank, {
      type: "respondToChallenge",
      id: "cr-1",
      challenge: challengeSnapshot(),
      response: "Something I noticed",
      now: T1,
    });
    expect(sectionHasContent(responded, "research")).toBe(true);
  });

  it("marks Research once a trail step has notes, but not for merely opening the trail", () => {
    const opened = investigationReducer(blankInvestigation(), { type: "setTrailStep", trailId: TRAIL_ID, stepId: "x" });
    expect(sectionHasContent(opened, "research")).toBe(false);
    const noted = investigationReducer(opened, {
      type: "recordTrailDiscoveries",
      trailId: TRAIL_ID,
      step: trailStepSnapshot(),
      discoveries: "A discovery",
      now: T1,
    });
    expect(sectionHasContent(noted, "research")).toBe(true);
  });
});
