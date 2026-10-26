import { describe, expect, it } from "vitest";
import { buildContentRegistry, formatContentIssues } from "@/domain/study/content-registry";
import { RAW_STUDY_CONTENT, STUDY_CONTENT } from "./study-content";

describe("shipped study content", () => {
  it("passes every schema and cross-reference check", () => {
    const { issues } = buildContentRegistry(RAW_STUDY_CONTENT);
    expect(issues, formatContentIssues(issues)).toEqual([]);
  });

  it("has unique ids across investigations, attributes, passages, and sessions", () => {
    const ids = [
      ...STUDY_CONTENT.investigations.map((item) => `investigation:${item.id}`),
      ...STUDY_CONTENT.attributes.map((item) => `attribute:${item.id}`),
      ...STUDY_CONTENT.passages.map((item) => `passage:${item.id}`),
      ...STUDY_CONTENT.connectSessions.map((item) => `session:${item.id}`),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  // Release gate: every planned content file is written. Set STUDY_CONTENT_ALLOW_PLACEHOLDERS=1 while content is in progress.
  it.skipIf(process.env.STUDY_CONTENT_ALLOW_PLACEHOLDERS === "1")("has no placeholder files left", () => {
    expect(STUDY_CONTENT.placeholders).toEqual([]);
  });
});
