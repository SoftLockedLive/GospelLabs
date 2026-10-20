import { describe, expect, it } from "vitest";
import { createId } from "./ids";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("createId", () => {
  it("creates unique v4 UUIDs", () => {
    const ids = Array.from({ length: 1000 }, () => createId());
    expect(new Set(ids).size).toBe(1000);
    for (const id of ids.slice(0, 20)) expect(id).toMatch(UUID_V4);
  });

  it("falls back to getRandomValues when randomUUID is unavailable (plain-http pages)", () => {
    const insecure = { getRandomValues: crypto.getRandomValues.bind(crypto) };
    const ids = Array.from({ length: 1000 }, () => createId(insecure));
    expect(new Set(ids).size).toBe(1000);
    for (const id of ids.slice(0, 20)) expect(id).toMatch(UUID_V4);
  });
});
