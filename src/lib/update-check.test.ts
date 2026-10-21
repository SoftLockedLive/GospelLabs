import { describe, expect, it, vi } from "vitest";
import { fetchDeployedVersion, isUpdateAvailable, VERSION_URL } from "./update-check";

const respond = (body: unknown, ok = true) => vi.fn(async () => ({ ok, json: async () => body }) as Response);

describe("fetchDeployedVersion", () => {
  it("reads the deployed version, bypassing caches", async () => {
    const fetcher = respond({ version: "20261101120000" });
    expect(await fetchDeployedVersion(fetcher)).toBe("20261101120000");
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(new RegExp(`^${VERSION_URL}\\?t=\\d+$`));
    expect(init).toEqual({ cache: "no-store" });
  });

  it.each([
    ["a failed request", respond({ version: "x" }, false)],
    ["a missing version", respond({})],
    ["a non-text version", respond({ version: 7 })],
    ["invalid JSON", vi.fn(async () => ({ ok: true, json: async () => Promise.reject(new SyntaxError("bad")) }) as unknown as Response)],
    ["no network", vi.fn(async () => Promise.reject(new TypeError("offline")))],
  ])("returns null for %s", async (_name, fetcher) => {
    expect(await fetchDeployedVersion(fetcher as unknown as typeof fetch)).toBeNull();
  });
});

describe("isUpdateAvailable", () => {
  it("is true only when a different build is deployed", () => {
    expect(isUpdateAvailable("2", "1")).toBe(true);
    expect(isUpdateAvailable("1", "1")).toBe(false);
    expect(isUpdateAvailable(null, "1")).toBe(false);
  });
});
