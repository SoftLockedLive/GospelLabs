import { describe, expect, it } from "vitest";
import {
  chooseChallenge,
  parseResearchChallenges,
  seededFraction,
  type ChallengeType,
  type ResearchChallenge,
} from "./research-challenges";

const challenge = (id: string, type: ChallengeType = "observe"): ResearchChallenge => ({
  id,
  type,
  title: `Title ${id}`,
  prompt: `Prompt ${id}`,
});

const file = (challenges: unknown[]) => ({ version: 1, challenges });

describe("parseResearchChallenges", () => {
  it("accepts valid challenges, with or without a tip", () => {
    const entries = [challenge("a"), { ...challenge("b", "apply"), tip: "A hint." }];
    expect(parseResearchChallenges(file(entries))).toEqual({ challenges: entries, issues: [] });
  });

  it.each([
    ["an unknown type", { ...challenge("a"), type: "debate" }, "type"],
    ["an empty prompt", { ...challenge("a"), prompt: "   " }, "prompt"],
    ["a missing title", { id: "a", type: "observe", prompt: "P" }, "title"],
    ["an id that isn't a slug", { ...challenge("a"), id: "Observe Things" }, "id"],
    ["an unknown field", { ...challenge("a"), answer: "The right answer" }, ""],
  ])("rejects %s and says where", (_name, entry, field) => {
    const { challenges, issues } = parseResearchChallenges(file([entry]));
    expect(challenges).toEqual([]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("challenges[0]");
    if (field) expect(issues[0]).toContain(`→ ${field}:`);
  });

  it("keeps the first of two challenges with the same id", () => {
    const { challenges, issues } = parseResearchChallenges(file([challenge("a"), challenge("a", "apply")]));
    expect(challenges).toEqual([challenge("a")]);
    expect(issues).toEqual(["challenges[1] (a): duplicate id"]);
  });

  it("rejects an unknown file version", () => {
    expect(parseResearchChallenges({ version: 2, challenges: [] }).issues).toEqual(["version must be 1"]);
  });
});

describe("chooseChallenge", () => {
  const challenges = [challenge("o1"), challenge("o2"), challenge("c1", "compare"), challenge("a1", "apply")];
  const none = new Set<string>();

  it("prefers challenges without a response", () => {
    const answered = new Set(["o1", "o2", "c1"]);
    for (const random of [0, 0.5, 0.99]) {
      expect(chooseChallenge(challenges, { type: null, answered, random: () => random })?.id).toBe("a1");
    }
  });

  it("never repeats the current challenge while another is available", () => {
    for (const random of [0, 0.3, 0.6, 0.99]) {
      expect(chooseChallenge(challenges, { type: null, answered: none, currentId: "o1", random: () => random })?.id).not.toBe("o1");
    }
  });

  it("offers answered challenges again once every one has a response", () => {
    const answered = new Set(challenges.map((item) => item.id));
    const next = chooseChallenge(challenges, { type: null, answered, currentId: "o1", random: () => 0 });
    expect(next?.id).toBe("o2");
  });

  it("limits the choice to the requested type", () => {
    for (const random of [0, 0.99]) {
      expect(chooseChallenge(challenges, { type: "observe", answered: none, random: () => random })?.type).toBe("observe");
    }
    expect(chooseChallenge(challenges, { type: "compare", answered: none, currentId: "o1" })?.id).toBe("c1");
  });

  it("returns the current challenge when it is the only one of its type", () => {
    expect(chooseChallenge(challenges, { type: "apply", answered: none, currentId: "a1" })?.id).toBe("a1");
  });

  it("returns undefined when nothing matches", () => {
    expect(chooseChallenge(challenges, { type: "question", answered: none })).toBeUndefined();
    expect(chooseChallenge([], { type: null, answered: none })).toBeUndefined();
  });
});

describe("seededFraction", () => {
  it("is stable for a seed, in [0, 1), and varies between seeds", () => {
    const seeds = ["inv-1", "inv-2", "3f0c9b2e-1d2a-4c55-9a51-8f7e6d5c4b3a", ""];
    const values = seeds.map(seededFraction);
    expect(seeds.map(seededFraction)).toEqual(values);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    expect(new Set(values).size).toBe(seeds.length);
  });
});
