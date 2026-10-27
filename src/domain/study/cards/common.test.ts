import { describe, expect, it } from "vitest";
import { withLearnerWriting } from "./common";

describe("withLearnerWriting", () => {
  it("adds writing under its heading, once", () => {
    const notes = withLearnerWriting("", [{ heading: "Bring it to Him", text: " He knows. " }]);
    expect(notes).toBe("Bring it to Him\nHe knows.");
    expect(withLearnerWriting(notes, [{ heading: "Bring it to Him", text: "He knows." }])).toBe(notes);
  });

  it("never removes what the learner wrote in the notes", () => {
    expect(withLearnerWriting("Mine.", [{ text: "From the page." }])).toBe("Mine.\n\nFrom the page.");
    expect(withLearnerWriting("Mine.", [{ text: "" }])).toBe("Mine.");
  });

  it("replaces writing that has grown since it was added, instead of repeating it", () => {
    const notes = "Mine.\n\nStep one\nHe knows my pains.";
    expect(withLearnerWriting(notes, [{ heading: "Step one", text: "He knows my pains, and my sins." }])).toBe("Mine.\n\nStep one\nHe knows my pains, and my sins.");
    // Rewritten rather than grown: both are kept.
    expect(withLearnerWriting(notes, [{ heading: "Step one", text: "He understands." }])).toBe(`${notes}\n\nStep one\nHe understands.`);
  });
});
