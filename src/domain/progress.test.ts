import { describe, expect, it } from "vitest";
import { investigationReducer } from "./investigation-reducer";
import { sectionHasContent } from "./progress";
import { blankInvestigation, challengeSnapshot, T1 } from "./test-fixtures";

describe("sectionHasContent", () => {
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
});
