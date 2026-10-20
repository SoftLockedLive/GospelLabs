import { describe, expect, it } from "vitest";
import { APP_VERSION, FEEDBACK_EMAIL, feedbackMailto } from "./feedback";

function parse(link: string) {
  const [address, query] = link.replace(/^mailto:/, "").split("?");
  const params = Object.fromEntries(
    query.split("&").map((pair) => {
      const [key, value] = pair.split("=");
      return [key, decodeURIComponent(value)];
    }),
  );
  return { address, ...params } as { address: string; subject: string; body: string };
}

describe("feedbackMailto", () => {
  it("addresses the feedback inbox with a subject and template for each kind", () => {
    expect(FEEDBACK_EMAIL).toBe("gospellabs@proton.me");
    const bug = parse(feedbackMailto("bug"));
    expect(bug.address).toBe(FEEDBACK_EMAIL);
    expect(bug.subject).toBe("Gospel Labs bug report");
    expect(bug.body).toContain("What happened?");
    expect(parse(feedbackMailto("idea")).subject).toBe("Gospel Labs idea");
  });

  it("ends with the app version and includes optional details", () => {
    const { body } = parse(feedbackMailto("bug", "Error shown: boom"));
    expect(body).toContain("Error shown: boom");
    expect(body.endsWith(`App version: ${APP_VERSION}`)).toBe(true);
  });

  it("encodes spaces as %20 and line breaks as CRLF", () => {
    const link = feedbackMailto("idea");
    expect(link).not.toContain("+");
    expect(link).toContain("Gospel%20Labs%20idea");
    expect(link).toContain("%0D%0A");
  });
});
