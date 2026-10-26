import { describe, expect, it } from "vitest";
import type { Source } from "../content-schema";
import { discoveryCardSchema } from "../user-data";
import { connectDiscoveryCard, findConnectCard, withConnectNote } from "./connect";

const SOURCE: Source = {
  id: "john-14-27",
  kind: "scripture",
  label: "John 14:27",
  url: "https://www.churchofjesuschrist.org/study/scriptures/nt/john/14?lang=eng&id=p27#p27",
  verses: [
    {
      number: 27,
      text: "Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.",
    },
  ],
};

const now = new Date("2026-10-26T15:00:00.000Z");
const reflect = { id: "my-peace-i-give", title: "My Peace I Give unto You" };

describe("connectDiscoveryCard", () => {
  it("builds a valid card that cites the session's scripture", () => {
    const card = connectDiscoveryCard({ session: reflect, source: SOURCE, id: "card-1", now });
    expect(discoveryCardSchema.safeParse(card).success).toBe(true);
    expect(card).toMatchObject({
      id: "card-1",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      origin: { kind: "connect", contentId: "my-peace-i-give" },
      title: "My Peace I Give unto You",
      sources: [{ id: "john-14-27", label: "John 14:27", kind: "scripture", url: SOURCE.url }],
      notes: "",
    });
    expect(card).not.toHaveProperty("question");
  });

  it("records nothing about the session beyond the scripture and the learner's note", () => {
    const card = connectDiscoveryCard({ session: reflect, source: SOURCE, note: "  Peace, not as the world gives.  ", id: "card-1", now });
    expect(card.notes).toBe("Peace, not as the world gives.");
    expect(card.summary).toBe("");
    expect(card.concepts).toEqual([]);
    expect(card.connections).toEqual([]);
    expect(card.highlights).toEqual([]);
  });

  it("keeps the question explored in an Understand Christ session", () => {
    const card = connectDiscoveryCard({
      session: { id: "rest-unto-your-souls", title: "Rest unto Your Souls", question: "What kind of rest does the Savior offer?" },
      source: SOURCE,
      id: "card-2",
      now,
    });
    expect(card.question).toBe("What kind of rest does the Savior offer?");
  });
});

describe("findConnectCard", () => {
  it("finds the most recent card saved from the session", () => {
    const older = connectDiscoveryCard({ session: reflect, source: SOURCE, id: "older", now: new Date("2026-10-01T00:00:00.000Z") });
    const newer = connectDiscoveryCard({ session: reflect, source: SOURCE, id: "newer", now });
    const other = connectDiscoveryCard({ session: { id: "jesus-wept", title: "Jesus Wept" }, source: SOURCE, id: "other", now });
    const passage = { ...newer, id: "passage", origin: { kind: "passage" as const, contentId: "my-peace-i-give" } };
    expect(findConnectCard([older, other, newer, passage], "my-peace-i-give")?.id).toBe("newer");
    expect(findConnectCard([other], "my-peace-i-give")).toBeUndefined();
  });
});

describe("withConnectNote", () => {
  it("updates only the note and the time", () => {
    const card = connectDiscoveryCard({ session: reflect, source: SOURCE, note: "First", id: "card-1", now });
    const later = new Date("2026-10-27T09:00:00.000Z");
    const updated = withConnectNote(card, " Second ", later);
    expect(updated).toEqual({ ...card, notes: "Second", updatedAt: later.toISOString() });
  });
});
