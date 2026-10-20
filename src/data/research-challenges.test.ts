/** Checks the shipped research challenges file. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CHALLENGE_TYPES, parseResearchChallenges } from "@/domain/research-challenges";

const path = fileURLToPath(new URL("./research-challenges.json", import.meta.url));

describe("src/data/research-challenges.json", () => {
  const result = parseResearchChallenges(JSON.parse(readFileSync(path, "utf8")));

  it("is valid", () => {
    // Prints the exact entries and fields to fix when this fails.
    expect(result.issues.join("\n")).toBe("");
  });

  it.each(CHALLENGE_TYPES)("offers at least three %s challenges", (type) => {
    expect(result.challenges.filter((challenge) => challenge.type === type).length).toBeGreaterThanOrEqual(3);
  });
});
